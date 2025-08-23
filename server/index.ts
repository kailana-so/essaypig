dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import cors from 'cors';
import presignRouter from './routes/presign';
import summarisepigRouter from './routes/summarypig';
import welcomeEmailRouter from './routes/welcomeEmail';
import { reminderFortnightlyBITEXT, scheduleFortnightlyBITEXT, scheduleMonthlyBBTC, reminderMonthlyBBTC } from './jobs/scheduler';
// import { test_reminderFortnightlyBITEXT, test_reminderMonthlyBBTC, test_scheduleFortnightlyBITEXT, test_scheduleMonthlyBBTC} from './jobs/schedulerTesting'


const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/presign', presignRouter);
app.use('/api/summarypig', summarisepigRouter);
app.use('/api/welcomeEmail', welcomeEmailRouter);

/** TESTING */
if (process.env.NODE_ENV === 'development') {
  // test_scheduleFortnightlyBITEXT();
  // test_scheduleMonthlyBBTC();
  // test_reminderMonthlyBBTC()
  // test_reminderFortnightlyBITEXT()
} else { 
  // Start bbtc cron
  scheduleFortnightlyBITEXT();
  // start bitext cron
  scheduleMonthlyBBTC();

  // reminder emails
  reminderMonthlyBBTC();
  reminderFortnightlyBITEXT();
}

app.listen(port, () => {
  console.log(`\n🐷 🟢 🐷  Server running on http://localhost:${port}`);
});
