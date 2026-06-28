import cron from 'node-cron';
import { newTextEmail } from '../email/newTextEmail';
import { db } from '../services/firebase';
import { USERS_COLLECTION, NK_GROUP, TYPE_PDF, TYPE_EPUB } from '../utils/constants';
import { getRandomResource } from '../utils/getRandomResource';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { testSchedule } from './crons';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function getPresignedUrl(bucket: string, fileName: string) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileName });
  return getSignedUrl(s3, command, { expiresIn: 86400 });
}

export function test_sendNewTextNK() {
  cron.schedule(testSchedule, async () => {
    try {
      const resource = await getRandomResource(NK_GROUP);
      if (!resource) return console.warn('[TEST] No available resource found.');

      const { url, type, summary, fileName } = resource;
      const resolvedUrl = (type === TYPE_PDF || type === TYPE_EPUB)
        ? await getPresignedUrl(process.env.AWS_BUCKET_NAME!, fileName)
        : url;

      const snapshot = await db.collection(USERS_COLLECTION).where('test', '==', true).get();

      for (const doc of snapshot.docs) {
        const email = doc.id;
        if (!email) continue;
        await newTextEmail(email, NK_GROUP, type, resolvedUrl, summary);
        console.log(`[TEST] Email sent to ${email}`);
      }
    } catch (err) {
      console.error('[TEST] Error:', err);
    }
  });
}
