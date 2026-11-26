import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { db } from './firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files from project root (.env.local, .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const rawCorsOrigin = (process.env.CORS_ORIGIN || '').trim();
const allowedOrigins = rawCorsOrigin && rawCorsOrigin !== '*'
  ? rawCorsOrigin.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
  : null;

app.use(cors({
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
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

    let correctPassword = null;

    // 1. Primary: Fetch password from Firestore collection('settings').doc('auth')
    if (db) {
      try {
        const firestorePromise = db.collection('settings').doc('auth').get();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 3000)
        );
        const configDoc = await Promise.race([firestorePromise, timeoutPromise]);
        if (configDoc.exists && configDoc.data()?.password) {
          correctPassword = configDoc.data().password;
        }
      } catch (err) {
        console.warn('[Firestore] Notice while reading settings/auth:', err.message);
      }
    }

    // 2. Fallback: Use server environment variable if Firestore document is not present
    if (!correctPassword) {
      correctPassword = process.env.TOOLS_PASSWORD || process.env.PASSWORD;
    }

    if (!correctPassword) {
      return res.status(500).json({
        success: false,
        message: 'Master password is not configured in Firestore (collection: settings, document: auth, field: password) or environment variables.'
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

// In-memory cache for tool visibility overrides (persisted to Firestore if connected)
let cachedVisibilityOverrides = {};

// Retrieve global tool visibility settings
app.get('/api/settings/visibility', async (req, res) => {
  if (db) {
    try {
      const docPromise = db.collection('settings').doc('visibility').get();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 1500)
      );
      const doc = await Promise.race([docPromise, timeoutPromise]);
      if (doc.exists && doc.data()?.overrides) {
        cachedVisibilityOverrides = doc.data().overrides;
      }
    } catch {
      // Fall back to in-memory state
    }
  }

  res.json({
    success: true,
    overrides: cachedVisibilityOverrides
  });
});

// Update global tool visibility settings
app.post('/api/settings/visibility', async (req, res) => {
  try {
    const { overrides } = req.body;
    if (!overrides || typeof overrides !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Overrides map is required'
      });
    }

    cachedVisibilityOverrides = { ...cachedVisibilityOverrides, ...overrides };

    if (db) {
      try {
        const setPromise = db.collection('settings').doc('visibility').set({
          overrides: cachedVisibilityOverrides,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firestore timeout')), 2000)
        );
        await Promise.race([setPromise, timeoutPromise]);
      } catch {
        // Cached in memory
      }
    }

    res.json({
      success: true,
      overrides: cachedVisibilityOverrides,
      message: 'Visibility updated'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// OSINT Persona Intelligence & Footprint Synthesis
app.post('/api/osint/analyze', async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      phone,
      location,
      company,
      domain,
      tags,
      customApiKey,
      model = process.env.GEMINI_MODEL || 'gemini-3.7-flash'
    } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full Name is required for OSINT analysis.'
      });
    }

    const apiKey = customApiKey || req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Google Gemini API key not found. Please provide an API key in tool settings or configure GEMINI_API_KEY in server environment.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a cybersecurity expert and seasoned OSINT Intelligence Analyst. Conduct a structured open-source intelligence analysis and footprint hypothesis for the following individual based on public indicators.

TARGET INDICATORS:
- Full Name: ${fullName.trim()}
- Known Username / Alias: ${username ? username.trim() : 'Not provided'}
- Known Email: ${email ? email.trim() : 'Not provided'}
- Known Phone: ${phone ? phone.trim() : 'Not provided'}
- Location: ${location ? location.trim() : 'Not provided'}
- Organization / Company: ${company ? company.trim() : 'Not provided'}
- Associated Domain / Website: ${domain ? domain.trim() : 'Not provided'}
- Known Context / Tags: ${tags ? tags.trim() : 'None'}

Please provide your analysis in valid JSON format matching this exact structure:
{
  "summary": "Concise 2-3 sentence executive intelligence summary of this persona profile",
  "potentialAliases": ["alias1", "alias2", "alias3"],
  "emailPermutations": ["email1@domain.com", "email2@domain.com"],
  "highProbabilityFootprints": [
    {
      "platform": "Platform Name",
      "category": "Professional | Developer | Social | Registry",
      "rationale": "Why this entity is likely present here",
      "targetedDork": "exact google search query"
    }
  ],
  "investigativePivots": [
    "Step 1: Check professional affiliations...",
    "Step 2: Cross-reference code commits...",
    "Step 3: Verify domain registration..."
  ],
  "corroborationChecklist": [
    "Verify avatar matching across accounts",
    "Cross-reference location timestamps",
    "Confirm mutual connections on professional networks"
  ],
  "graphNodes": [
    {"id": "person_root", "label": "${fullName.trim()}", "type": "person", "details": "Target individual"}
  ],
  "graphLinks": [],
  "rawAnalysisMarkdown": "# Detailed OSINT Persona Dossier\\n\\n### Executive Assessment\\n..."
}

Ensure all JSON strings are properly formatted. Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '';
    let parsedResult;
    try {
      const cleaned = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      parsedResult = {
        summary: `OSINT Intelligence profile synthesized for ${fullName}.`,
        potentialAliases: [],
        emailPermutations: [],
        highProbabilityFootprints: [],
        investigativePivots: ['Check verified professional directories', 'Scan document metadata'],
        corroborationChecklist: ['Verify location timeline', 'Check avatar consistency'],
        graphNodes: [{ id: 'person_root', label: fullName.trim(), type: 'person', details: 'Target' }],
        graphLinks: [],
        rawAnalysisMarkdown: rawText
      };
    }

    return res.json({
      success: true,
      result: parsedResult
    });
  } catch (err) {
    console.error('[OSINT] Error in /api/osint/analyze:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error occurred during OSINT intelligence analysis.'
    });
  }
});

// OSINT Launch URL in Incognito/Private Window on Host OS
app.post('/api/osint/open-incognito', (req, res) => {
  try {
    const { url, urls } = req.body;
    const targetUrls = (urls && Array.isArray(urls) ? urls : (url ? [url] : [])).filter(Boolean);

    if (targetUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'No URL provided' });
    }

    const platform = os.platform();

    targetUrls.forEach((targetUrl) => {
      const cleanUrl = String(targetUrl).replace(/"/g, '\\"');

      if (platform === 'darwin') {
        // macOS: Chrome, Brave, Arc, Edge, Firefox with private/incognito flags
        const chromeCmd = `open -na "Google Chrome" --args --incognito "${cleanUrl}"`;
        exec(chromeCmd, (err) => {
          if (err) {
            exec(`open -na "Brave Browser" --args --incognito "${cleanUrl}"`, (err2) => {
              if (err2) {
                exec(`open -na "Arc" --args --incognito "${cleanUrl}"`, (err3) => {
                  if (err3) {
                    exec(`open -na "Firefox" --args -private-window "${cleanUrl}"`, (err4) => {
                      if (err4) {
                        exec(`open "${cleanUrl}"`);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      } else if (platform === 'win32') {
        // Windows
        exec(`start chrome --incognito "${cleanUrl}"`, (err) => {
          if (err) {
            exec(`start msedge -inprivate "${cleanUrl}"`, (err2) => {
              if (err2) exec(`start "${cleanUrl}"`);
            });
          }
        });
      } else {
        // Linux
        exec(`google-chrome --incognito "${cleanUrl}"`, (err) => {
          if (err) {
            exec(`firefox --private-window "${cleanUrl}"`, (err2) => {
              if (err2) exec(`xdg-open "${cleanUrl}"`);
            });
          }
        });
      }
    });

    return res.json({
      success: true,
      message: `Opened ${targetUrls.length} link(s) in Incognito window`
    });
  } catch (err) {
    console.error('[OSINT Incognito] Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Verify Firestore authentication document status on startup
async function verifyFirestoreConnection() {
  if (!db) {
    console.log('[Auth] Running in standalone mode. To enable Firestore password management, configure Firebase credentials.');
    return;
  }

  try {
    const docRef = db.collection('settings').doc('auth');
    const doc = await docRef.get();
    if (doc.exists && doc.data()?.password) {
      console.log('[Firestore] Successfully connected. Master password loaded from Firestore settings/auth.');
    } else {
      console.log('[Firestore] Document settings/auth does not have a password field yet. Create document settings/auth with field password in Firestore Console.');
    }
  } catch (err) {
    console.warn('[Firestore] Startup connection notice:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`[Server] Express server running on port ${PORT}`);
  console.log(`[Server] Password protection and network speedtest active`);
  await verifyFirestoreConnection();
});



