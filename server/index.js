import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files from project root (.env.local, .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory rate limiter for brute-force protection
const loginAttempts = new Map(); // ip -> { count, resetTime }

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 60000 }); // 1 min window
    return true;
  }

  if (record.count >= 6) {
    return false; // Rate limited
  }

  record.count += 1;
  return true;
}

// Server health check (Never exposes secrets)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firestoreConnected: Boolean(db),
    mode: db ? 'firestore' : 'env-standalone'
  });
});

// Timing-safe string comparison to prevent side-channel timing leaks
function safeCompare(input, expected) {
  const inputBuffer = Buffer.from(String(input));
  const expectedBuffer = Buffer.from(String(expected));

  if (inputBuffer.length !== expectedBuffer.length) {
    // Perform dummy comparison to equalize timing
    crypto.timingSafeEqual(inputBuffer, inputBuffer);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

// Verify secret tools password securely
app.post('/api/verify-password', async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed attempts. Please wait 60 seconds.'
    });
  }

  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    let correctPassword = process.env.TOOLS_PASSWORD || process.env.PASSWORD || 'secret123';

    // If Firestore is connected, check if there's a stored password document
    if (db) {
      try {
        const configDoc = await db.collection('settings').doc('auth').get();
        if (configDoc.exists && configDoc.data()?.password) {
          correctPassword = configDoc.data().password;
        }
      } catch (dbErr) {
        console.warn('⚠️ [Firestore] Failed to read settings/auth doc, using env fallback:', dbErr.message);
      }
    }

    if (safeCompare(password, correctPassword)) {
      // Clear rate limit counter on success
      loginAttempts.delete(clientIp);

      // Generate a cryptographically secure random session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      return res.json({
        success: true,
        message: 'Password verified successfully',
        token: sessionToken
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.'
      });
    }
  } catch (error) {
    console.error('❌ Error in /api/verify-password:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying password'
    });
  }
});

// Auto-sync password from .env to Firestore on startup
async function syncPasswordToFirestore() {
  if (!db) return;
  const envPassword = process.env.TOOLS_PASSWORD || process.env.PASSWORD;
  if (!envPassword) return;

  try {
    const docRef = db.collection('settings').doc('auth');
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.password !== envPassword) {
      await docRef.set({
        password: envPassword,
        updatedAt: new Date().toISOString(),
        syncedFromEnv: true
      }, { merge: true });
      console.log(`🔄 [Firestore] Synchronized master password from .env to Firestore settings/auth.`);
    } else {
      console.log(`✅ [Firestore] Master password in Firestore is up to date with .env.`);
    }
  } catch (err) {
    console.warn(`⚠️ [Firestore] Auto-sync warning:`, err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
  console.log(`🔒 Secret tools password protection active (Port: ${PORT})`);
  await syncPasswordToFirestore();
});


