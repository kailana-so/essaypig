import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory (where it's created during deployment)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

initializeApp({
  credential: cert(credentials),
});

export const db = getFirestore();
