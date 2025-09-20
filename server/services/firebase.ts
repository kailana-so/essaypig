import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

initializeApp({
  credential: cert(credentials),
});

export const db = getFirestore();
export { FieldValue }
