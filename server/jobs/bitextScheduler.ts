import cron from 'node-cron';
import { newTextEmail } from '../email/newTextEmail';
import { dayOfEmail } from '../email/dayOfEmail';
import { db, FieldValue } from '../services/firebase';
import { USERS_COLLECTION, BITEXT_GROUP, TYPE_PDF, TYPE_EPUB, RESOURCES_COLLECTION } from '../utils/constants';
import { getRandomResource, getSummary } from '../utils/getRandomResource';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { sendAllWithRateLimit } from '../utils/rateLimiter';
import { firstOfTheMonth, secondMondayReminder, reminderThirdThursday, isThirdThursday, isSecondMonday } from './crons';
import { oneWeekEmail } from '../email/oneWeekEmail';

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


export function sendNewTextBITEXT() {
  cron.schedule(firstOfTheMonth, async () => {
    try {
      const resource = await getRandomResource(BITEXT_GROUP);
      if (!resource) return console.warn('[BITEXT] No available resource found.');

      const { id, url, type, summary, fileName } = resource;
      const resolvedUrl = await resolveUrlForType(type, url, fileName);

      const snapshot = await db.collection(USERS_COLLECTION)
        .where('group', '==', BITEXT_GROUP).get();

      const docs = snapshot.docs;

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        if (!email || !group) return;
        await newTextEmail(email, group, type, resolvedUrl, summary);
      }, 2);

      if (failed.length === docs.length) {
        console.error('[BITEXT] ALL emails failed to send');
      } else {
        if (failed.length) {
          console.error('[BITEXT] Some emails failed to send:', failed.map(f => f.email.id));
        }
        //add up currency
        await db.collection(RESOURCES_COLLECTION).doc(id!).update({ bitext: true, current: FieldValue.arrayUnion(BITEXT_GROUP) });
      }
    } catch (err) {
      console.error('[BITEXT] Error running BITEXT_GROUP job:', err);
    }
  }, {
    timezone: 'Australia/Sydney',
  });
}

export function dayOfMonthlyBITEXT() {
  cron.schedule(reminderThirdThursday, async () => {
    try {

      const now = new Date();
      if (!isThirdThursday(now)) return;
      const snapshot = await db.collection(USERS_COLLECTION)
        .where('group', '==', BITEXT_GROUP).get();

      const docs = snapshot.docs;

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        if (!email) return;
        await dayOfEmail(email, BITEXT_GROUP);
      }, 2);

      if (failed.length === docs.length) {
        console.error('[BITEXT] ALL emails failed to send');
      } else {
        if (failed.length) {
          console.error('[BITEXT] Some emails failed to send:', failed.map(f => f.email.id));
        }
      }
    } catch (err) {
      console.error('[BITEXT] Error running BITEXT_GROUP reminder:', err);
    }
  }, {
    timezone: 'Australia/Sydney',
  });
}

export function oneWeekReminderBITEXT() {
  cron.schedule(secondMondayReminder, async () => {
    try {

      const now = new Date();
      if (!isSecondMonday(now)) return;
      const snapshot = await db.collection(USERS_COLLECTION)
        .where('group', '==', BITEXT_GROUP).get();

      const docs = snapshot.docs;
      const {id, summary} = await getSummary(BITEXT_GROUP);

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        if (!email) return;
        await oneWeekEmail(email, BITEXT_GROUP, summary);
      }, 2);

      if (failed.length === docs.length) {
        console.error('[BITEXT] ALL emails failed to send');
      } else {
        if (failed.length) {
          console.error('[BITEXT] Some emails failed to send:', failed.map(f => f.email.id));
        }
        //clean up currency
        await db.collection(RESOURCES_COLLECTION).doc(id!).update({
          current: FieldValue.arrayRemove(BITEXT_GROUP),
        });
      }
    } catch (err) {
      console.error('[BITEXT] Error running BITEXT_GROUP reminder:', err);
    }
  }, {
    timezone: 'Australia/Sydney',
  });
}
