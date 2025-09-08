import cron from 'node-cron';
import { scheduledEmail } from '../email/scheduledEmail';
import { reminderEmail } from '../email/reminderEmail';
import { db } from '../services/firebase';
import { USERS_COLLECTION, MONTHLY, TYPE_PDF, TYPE_EPUB, FORNIGHTLY, RESOURCES_COLLECTION } from '../utils/constants';
import { getRandomResource } from '../utils/getRandomResource';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { sendAllWithRateLimit } from '../utils/rateLimiter';

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

/**
 * scheduleBbtc sends a scheduled email for 1st of every month
 */
const scheduleBbtc = '0 9 1 * *';

/**
 * reminderBbtc sends a reminded email for 3rd Tuesday of the month
 */
const reminderBbtc = '0 9 15-21 * 2'; 

export function scheduleMonthlyBBTC() {
  cron.schedule(scheduleBbtc, async () => {
    try {
      const resource = await getRandomResource(MONTHLY);
      if (!resource) return console.warn('[BBTC] No available resource found.');

      const { id, url, type, summary, fileName } = resource;
      const resolvedUrl = await resolveUrlForType(type, url, fileName);

      const snapshot = await db.collection(USERS_COLLECTION)
        .where('group', '==', MONTHLY).get();

      const docs = snapshot.docs;

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        if (!email || !group) return;
        await scheduledEmail(email, group, type, resolvedUrl, summary);
      }, 2);

      if (failed.length) {
        console.error('[BBTC] Some emails failed to send:', failed.map(f => f.email.id));
      } else {
        await db.collection(RESOURCES_COLLECTION).doc(id!).update({ bbtc: true });
      }
    } catch (err) {
      console.error('[BBTC] Error running monthly job:', err);
    }
  });
}

function isThirdTuesday(date: Date): boolean {
  if (date.getDay() !== 2) return false; // 2 = Tuesday

  const year = date.getFullYear();
  const month = date.getMonth();

  // find first Tuesday of this month
  const firstDay = new Date(year, month, 1);
  const firstTuesday = new Date(
    year,
    month,
    1 + ((2 - firstDay.getDay() + 7) % 7)
  );

  // third Tuesday is 14 days later
  const thirdTuesday = new Date(firstTuesday);
  thirdTuesday.setDate(firstTuesday.getDate() + 14);

  return date.getDate() === thirdTuesday.getDate();
}

export function reminderMonthlyBBTC() {
  cron.schedule(reminderBbtc, async () => {
    try {

      const now = new Date();
      if (!isThirdTuesday(now)) return;
      const snapshot = await db.collection(USERS_COLLECTION)
        .where('group', '==', MONTHLY).get();

      const docs = snapshot.docs;

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        console.log(group, "TBBTC")

        if (!email) return;
        await reminderEmail(email, MONTHLY);
      }, 2);

      if (failed.length) {
        console.error('[BBTC] Some reminders failed:', failed.map(f => f.email.id));
      }
    } catch (err) {
      console.error('[BBTC] Error running monthly reminder:', err);
    }
  });
}

/**
 * scheduleBitext sends a schedules email for 2nd and 4th Monday of the month
 */
const scheduleBitext = '0 9 8-28 * *'; 

/**
 * reminderBitext sends a schedules email for 1st and 3rd Friday of the month
 */
const reminderBitext = '0 8 7-30 * 5'; 


function isSecondOrFourthMonday(date: Date): boolean {
  if (date.getDay() !== 1) return false; // 1 = Monday
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return weekOfMonth === 2 || weekOfMonth === 4;
}

function isFirstOrThirdFriday(date: Date): boolean {
  if (date.getDay() !== 5) return false; // must be Friday

  const year = date.getFullYear();
  const month = date.getMonth();

  // find the first Friday of this month
  const firstDay = new Date(year, month, 1);
  const firstFriday = new Date(year, month, 1 + ((5 - firstDay.getDay() + 7) % 7));

  // then the third Friday is two weeks later
  const thirdFriday = new Date(firstFriday);
  thirdFriday.setDate(firstFriday.getDate() + 14);

  return (
    date.getDate() === firstFriday.getDate() ||
    date.getDate() === thirdFriday.getDate()
  );
}


export function scheduleFortnightlyBITEXT() {
  cron.schedule(scheduleBitext, async () => {

    const now = new Date();
    if (!isSecondOrFourthMonday(now)) return;

    try {
      const resource = await getRandomResource(FORNIGHTLY);
      if (!resource) {
        console.warn('[BITEXT] No available resource found.');
        return;
      }

      const { id,url, type, summary, fileName } = resource;
      const resolvedUrl = await resolveUrlForType(type, url, fileName);
      const snapshot = await db.collection(USERS_COLLECTION).where('group', '==', FORNIGHTLY).get();
      const docs = snapshot.docs;

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        if (!email || !group) return;
        await scheduledEmail(email, group, type, resolvedUrl, summary);
      }, 2);

      if (failed.length) {
        console.error('[BITEXT] Some emails failed to send:', failed.map(f => f.email.id));
      } else {
        await db.collection(RESOURCES_COLLECTION).doc(id!).update({
          bitext: true,
        });
      }
    } catch (err) {
      console.error('[BITEXT] Error running email job:', err);
    }
  });
}

export function reminderFortnightlyBITEXT() {
  cron.schedule(reminderBitext, async () => {

    const now = new Date();
    if (!isFirstOrThirdFriday(now)) return;
    
    try {
      const snapshot = await db.collection(USERS_COLLECTION).where('group', '==', FORNIGHTLY).get();
      const docs =  snapshot.docs

      const { failed } = await sendAllWithRateLimit(docs, async (doc) => {
        const email = doc.id;
        const { group } = doc.data();

        console.log(group)
        if (!email || !group) return;
        await reminderEmail(email, group);
      }, 2);

      if (failed.length) {
        console.error('[BITEXT] Some reminders failed:', failed.map(f => f.email.id));
      }
    } catch (err) {
      console.error('[BITEXT] Error running reminder email job:', err);
    }
  });
}
