
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') }); 
import cors from 'cors';
import presignRouter from './routes/presign';
import summarisepigRouter from './routes/summarypig';
import welcomeEmailRouter from './routes/welcomeEmail';
import meetRouter from './routes/meetingRedirect';
import { sendNewTextBBTC, dayOfMonthlyBBTC, oneWeekReminderBBTC } from './jobs/bbtcScheduler';
import { dayOfMonthlyBITEXT, oneWeekReminderBITEXT, sendNewTextBITEXT } from './jobs/bitextScheduler';
// import { test_dayOfMonthlyBBTC, test_dayOfMonthlybitext, test_oneWeekReminderBBTC, test_oneWeekReminderbitext, test_sendNewTextBBTC, test_sendNewTextbitext } from './jobs/schedulerTesting';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/m', meetRouter);
app.use('/api/presign', presignRouter);
app.use('/api/summarypig', summarisepigRouter);
app.use('/api/welcomeEmail', welcomeEmailRouter);

/** TESTING */
if (process.env.NODE_ENV === 'development') {
  // test_sendNewTextBBTC();
  // test_sendNewTextbitext();
  // test_oneWeekReminderBBTC();
  // test_oneWeekReminderbitext();
  // test_dayOfMonthlyBBTC();
  // test_dayOfMonthlybitext();
} else { 
  // BITEXT cron
  sendNewTextBITEXT();
  oneWeekReminderBITEXT();
  dayOfMonthlyBITEXT();

  // BBTC cron
  sendNewTextBBTC();
  oneWeekReminderBBTC();
  dayOfMonthlyBBTC();

}

app.listen(port, () => {
  console.log(`\n🐷 🟢 🐷  Server running on http://localhost:${port}`);
});
