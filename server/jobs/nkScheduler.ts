import cron from 'node-cron';
import { newTextEmail } from '../email/newTextEmail';
import { db, FieldValue } from '../services/firebase';
import { USERS_COLLECTION, NK_GROUP, TYPE_PDF, TYPE_EPUB, RESOURCES_COLLECTION } from '../utils/constants';
import { getRandomResource } from '../utils/getRandomResource';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { sendAllWithRateLimit } from '../utils/rateLimiter';
import { fortnightly } from './crons';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function getPresignedUrl(bucket: string, fileName: string, expiresIn = 86400) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileName });
  return getSignedUrl(s3, command, { expiresIn });
}

async function resolveUrlForType(type: string, url: string, fileName: string): Promise<string> {
  if (type === TYPE_PDF || type === TYPE_EPUB) {
    const bucket = process.env.AWS_BUCKET_NAME!;
    return getPresignedUrl(bucket, fileName);
  }
  return url;
}

export function sendNewTextNK() {
  cron.schedule(fortnightly, async () => {
    try {
      const resource = await getRandomResource(NK_GROUP);
      if (!resource) return console.warn('[NK] No available resource found.');

      const { id, url, type, summary, fileName } = resource;
      const resolvedUrl = await resolveUrlForType(type, url, fileName);

      const snapshot = await db.collection(USERS_COLLECTION)
        .where('group', '==', NK_GROUP).get();

      const docs = snapshot.docs;
      if (!docs.length) return console.warn('[NK] No recipients in group — nothing sent.');

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        if (!email || !group) return;
        await newTextEmail(email, group, type, resolvedUrl, summary);
      }, 2);

      if (failed.length === docs.length) {
        console.error('[NK] ALL emails failed to send');
      } else {
        if (failed.length) {
          console.error('[NK] Some emails failed to send:', failed.map(f => f.email.id));
        }
        // Hand `current` over to the new text. Clearing every previous holder
        // rather than just the last one also heals resources that accumulated
        // the flag before this was fixed. The new pick can't be among them —
        // getRandomResource only selects where nk == false.
        const previous = await db.collection(RESOURCES_COLLECTION)
          .where('current', 'array-contains', NK_GROUP).get();

        const batch = db.batch();
        for (const doc of previous.docs) {
          batch.update(doc.ref, { current: FieldValue.arrayRemove(NK_GROUP) });
        }
        batch.update(db.collection(RESOURCES_COLLECTION).doc(id!), {
          nk: true,
          current: FieldValue.arrayUnion(NK_GROUP),
        });
        await batch.commit();
      }
    } catch (err) {
      console.error('[NK] Error running NK job:', err);
    }
  }, {
    timezone: 'Australia/Sydney',
  });
}
