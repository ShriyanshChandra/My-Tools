import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Pre-generate a 5MB random chunk for fast throughput streaming
const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB
const speedBuffer = crypto.randomBytes(CHUNK_SIZE);

// Network Speed Test / Ping Endpoints
app.get('/api/network/ping', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.json({
    status: 'ok',
    serverTime: Date.now(),
    clientTimestamp: req.query.t || null
  });
});

// Continuous In-Memory Download Stream (Zero Disk Storage, Zero File Saving)
app.get('/api/network/speedtest/download', (req, res) => {
  const durationMs = Math.min(Math.max(parseInt(req.query.duration) || 6000, 1000), 15000); // 1s to 15s max
  const requestedBytes = parseInt(req.query.bytes) || 0;

  res.set({
    'Content-Type': 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  if (requestedBytes > 0) {
    // Fixed-length byte mode
    res.set('Content-Length', requestedBytes);
    let bytesRemaining = requestedBytes;
    while (bytesRemaining > 0) {
      const chunk = Math.min(bytesRemaining, CHUNK_SIZE);
      res.write(speedBuffer.subarray(0, chunk));
      bytesRemaining -= chunk;
    }
    return res.end();
  }

  // Continuous real-time streaming mode over duration
  const startTime = Date.now();
  let isClosed = false;

  req.on('close', () => {
    isClosed = true;
  });

  const sendNextChunk = () => {
    if (isClosed || Date.now() - startTime >= durationMs) {
      return res.end();
    }

    const canContinue = res.write(speedBuffer);
    if (canContinue) {
      setImmediate(sendNextChunk);
    } else {
      res.once('drain', sendNextChunk);
    }
  };

  sendNextChunk();
});

// Ephemeral Upload Receiver (Discards all data immediately, zero disk storage, zero memory retention)
app.post('/api/network/speedtest/upload', (req, res) => {
  let bytesReceived = 0;
  const startTime = Date.now();

  req.on('data', (chunk) => {
    bytesReceived += chunk.length;
    // Chunk is immediately freed from memory
  });

  req.on('end', () => {
    const durationMs = Date.now() - startTime;
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.json({
      success: true,
      bytesReceived,
      durationMs,
      serverTime: Date.now()
    });
  });

  req.on('error', () => {
    res.status(500).json({ success: false });
  });
});

// In-memory rate limiter for brute-force protection
const loginAttempts = new Map(); // ip -> { count, resetTime }

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 60000 }); // 1 min window
    return true;
  }

  if (record.count >= 15) {
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

    let correctPassword = process.env.TOOLS_PASSWORD || process.env.PASSWORD;

    // If Firestore is connected, check if there's a stored password document (with fast timeout)
    if (db) {
      try {
        const firestorePromise = db.collection('settings').doc('auth').get();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 1500)
        );
        const configDoc = await Promise.race([firestorePromise, timeoutPromise]);
        if (configDoc.exists && configDoc.data()?.password) {
          correctPassword = configDoc.data().password;
        }
      } catch {
        // Fallback to env password silently
      }
    }

    if (!correctPassword) {
      console.warn('[Auth] TOOLS_PASSWORD is not set in server environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Authentication not configured on server. Please set TOOLS_PASSWORD in environment.'
      });
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
    console.error('[Auth] Error in /api/verify-password:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying password'
    });
  }
});

// Auto-sync password from .env to Firestore
async function syncPasswordToFirestore() {
  if (!db) return;

  // Re-read .env files dynamically with override: true
  dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
  dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

  const envPassword = process.env.TOOLS_PASSWORD || process.env.PASSWORD;
  if (!envPassword) return;

  try {
    const docRef = db.collection('settings').doc('auth');
    const getPromise = docRef.get();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore timeout')), 2000)
    );
    const doc = await Promise.race([getPromise, timeoutPromise]);

    if (!doc.exists || doc.data()?.password !== envPassword) {
      await docRef.set({
        password: envPassword,
        updatedAt: new Date().toISOString(),
        syncedFromEnv: true
      }, { merge: true });
      console.log('[Firestore] Synchronized master password from .env to Firestore settings/auth.');
    } else {
      console.log('[Firestore] Master password in Firestore is up to date with .env.');
    }
  } catch (err) {
    // Suppress verbose error if permission is denied, fallback to local env auth
    if (err.message && !err.message.includes('timeout')) {
      console.log('[Firestore] Firestore sync skipped, operating in environment password mode.');
    }
  }
}

// Watch .env.local for changes and auto-sync live
try {
  const envLocalPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envLocalPath)) {
    let debounceTimer = null;
    fs.watch(envLocalPath, (eventType) => {
      if (eventType === 'change') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          syncPasswordToFirestore();
        }, 300);
      }
    });
  }
} catch {
  // File watch fallback
}

app.listen(PORT, async () => {
  console.log(`[Server] Express server running on port ${PORT}`);
  console.log(`[Server] Password protection and network speedtest active`);
  await syncPasswordToFirestore();
});



