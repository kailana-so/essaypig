import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

initializeApp({
  credential: cert(credentials),
});

export const db = getFirestore();
