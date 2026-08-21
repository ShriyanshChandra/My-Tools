import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const newPassword = process.argv[2] || process.env.TOOLS_PASSWORD || 'secret123';

async function initFirestorePassword() {
  if (!db) {
    console.error('❌ Firestore is not connected. Please ensure your serviceAccountKey.json is placed in the project or FIREBASE_PROJECT_ID is configured in .env.');
    process.exit(1);
  }

  try {
    console.log(`⏳ Setting password in Firestore: collection('settings').doc('auth')...`);
    await db.collection('settings').doc('auth').set({
      password: newPassword,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ Success! Master password set in Firestore document: settings/auth`);
    console.log(`🔑 Password: "${newPassword}"`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to write to Firestore:', error.message);
    process.exit(1);
  }
}

initFirestorePassword();
