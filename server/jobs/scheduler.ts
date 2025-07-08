// cron/monthlyBBTC.ts
import cron from 'node-cron';
import { scheduledEmail } from '../email/scheduledEmail';
import { db } from '../services/firebase';
import { USERS_COLLECTION, MONTHLY, TYPE_PDF, TYPE_EPUB, FORNIGHTLY, RESOURCES_COLLECTION } from '../utils/constants';
import { getRandomResource } from '../utils/getRandomResource';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory (where it's created during deployment)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const s3 = new S3Client({ region: process.env.AWS_REGION });

async function getPresignedUrl(bucket: string, fileName: string, expiresIn = 86400) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileName });
  return getSignedUrl(s3, command, { expiresIn });
}

async function resolveUrlForType(type: string, url: string, fileName: string): Promise<string> {
  if (type === TYPE_PDF || type === TYPE_EPUB) {
    console.log(`[GENERATING]${type} file found, generating presigned URL...`);
    
    const bucket = process.env.AWS_BUCKET_NAME!;
    return getPresignedUrl(bucket, fileName);
  }

  return url;
}

const scheduleBbtc = process.env.NODE_ENV === 'development' ? '* * * * *' : '0 9 1 * *'; // 1st of every month 9:00 AM

export function scheduleMonthlyBBTC() {
  cron.schedule(scheduleBbtc, async () => {
    console.log('[BBTC] Running monthly bbtc email job...');

    try {
      const resource = await getRandomResource(MONTHLY);
      if (!resource) {
        console.warn('[BBTC] No available resource found.');
        return;
      }

      console.log('[BBTC] resource', resource);

      const { id, url, type, summary, fileName } = resource;

      const resolvedUrl = await resolveUrlForType(type, url, fileName);

      const snapshot = await db.collection(USERS_COLLECTION).where('group', '==', MONTHLY).get();

      const sendJobs = snapshot.docs.map(async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        if (email && group) {
          try {
            console.log(`[BBTC] Sending to ${email} (group: ${group})`);
            console.log(email, group, type, resolvedUrl, summary);
            await scheduledEmail(email, group, type, resolvedUrl, summary);
          } catch (err) {
            console.error(`⛔ [BBTC] Failed to send to ${email}:`, err);
          }
        }
      });

      const result = await Promise.allSettled(sendJobs);

      const failed = result.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('[BBTC] Some emails failed to send:', failed);
      } else {
        console.log('[BBTC] All emails sent successfully');
        await db.collection(RESOURCES_COLLECTION).doc(id!).update({
          bbtc: true,
        });
        console.log(`[BBTC] Marked resource ${id} as bbtc: true`);
      }
    } catch (err) {
      console.error('[BBTC] Error running email job:', err);
    }
  });
}

// schedule for 2nd and 4th Monday of the month
const scheduleBitext = process.env.NODE_ENV === 'development'
  ? '* * * * *'
  : '0 9 8-28 * *'; 

function isSecondOrFourthMonday(date: Date): boolean {
  if (date.getDay() !== 1) return false; // 1 = Monday
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return weekOfMonth === 2 || weekOfMonth === 4;
}

export function scheduleFortnightlyBITEXT() {
  cron.schedule(scheduleBitext, async () => {

    const now = new Date();
    if (!isSecondOrFourthMonday(now)) return;

    console.log('[BITEXT] Running fortnightly bitext email job...');

    try {
      const resource = await getRandomResource(FORNIGHTLY);
      if (!resource) {
        console.warn('[BITEXT] No available resource found.');
        return;
      }

      console.log('[BITEXT] resource', resource);

      const { id,url, type, summary, fileName } = resource;

      const resolvedUrl = await resolveUrlForType(type, url, fileName);

      const snapshot = await db.collection(USERS_COLLECTION).where('group', '==', FORNIGHTLY).get();

      const sendJobs = snapshot.docs.map(async (doc) => {
        const email = doc.id;
        const { group } = doc.data();
        if (email && group) {
          try {
            console.log(`[BITEXT] Sending to ${email} (group: ${group})`);
            console.log(email, group, type, resolvedUrl, summary);
            await scheduledEmail(email, group, type, resolvedUrl, summary);
          } catch (err) {
            console.error(`⛔[BITEXT] Failed to send to ${email}:`, err);
          }
        }
      });

      const result = await Promise.allSettled(sendJobs);
      const failed = result.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('[BITEXT] Some emails failed to send:', failed);
      } else {
        console.log('[BITEXT] All emails sent successfully');
        await db.collection(RESOURCES_COLLECTION).doc(id!).update({
          bitext: true,
        });
        console.log(`[BITEXT] Marked resource ${id} as bitext: true`);
      }
    } catch (err) {
      console.error('[BITEXT] Error running email job:', err);
    }
  });
}
