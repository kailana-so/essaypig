import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory (where it's created during deployment)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import cors from 'cors';
import presignRouter from './routes/presign';
import summarisepigRouter from './routes/summarypig';
import welcomeEmailRouter from './routes/welcomeEmail';
import { scheduleFortnightlyBITEXT, scheduleMonthlyBBTC } from './jobs/scheduler';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/presign', presignRouter);
app.use('/api/summarypig', summarisepigRouter);
app.use('/api/welcomeEmail', welcomeEmailRouter);


if (process.env.NODE_ENV !== 'development') {
  // Start bbtc cron
  scheduleMonthlyBBTC();

  // start bitext cron
  scheduleFortnightlyBITEXT();
}

app.listen(port, () => {
  console.log(`\n🐷 🟢 🐷  Server running on http://localhost:${port}`);
});
