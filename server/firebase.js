import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded from project root (.env.local, .env)
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let db = null;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Potential locations for serviceAccountKey.json
  const defaultLocations = [
    serviceAccountPath ? path.resolve(serviceAccountPath) : null,
    serviceAccountPath ? path.resolve(__dirname, '..', serviceAccountPath) : null,
    path.resolve(__dirname, './serviceAccountKey.json'),
    path.resolve(__dirname, '../serviceAccountKey.json'),
  ].filter(Boolean);

  const foundKeyPath = defaultLocations.find(loc => fs.existsSync(loc));

  let app;
  if (getApps().length > 0) {
    app = getApp();
  } else if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('✅ [Firestore] Firebase Admin initialized via service account JSON.');
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && (process.env.FIREBASE_PROJECT_ID || projectId)) {
    const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedPrivateKey
      })
    });
    console.log('✅ [Firestore] Firebase Admin initialized via environment credentials.');
  } else if (foundKeyPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(foundKeyPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log(`✅ [Firestore] Firebase Admin initialized via ${foundKeyPath}.`);
  } else if (projectId) {
    app = initializeApp({
      projectId: projectId
    });
    console.log(`✅ [Firestore] Firebase Admin initialized for project: ${projectId}.`);
  }

  if (app) {
    db = getFirestore(app);
  } else {
    console.log('ℹ️ [Firestore] No Firebase credentials configured in .env. Running with server-side environment password verification.');
  }
} catch (error) {
  console.warn('⚠️ [Firestore] Initialization warning:', error.message);
  console.log('ℹ️ [Firestore] Running in standalone server auth mode.');
}

export { db };
