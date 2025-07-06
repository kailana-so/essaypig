import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import presignRouter from './routes/presign';
import summarisepigRouter from './routes/summarypig';
import welcomeEmailRouter from './routes/welcomeEmail';
import { scheduleMonthlyBBTC, scheduleMonthlyBITEXT } from './jobs/scheduler';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/presign', presignRouter);
app.use('/api/summarypig', summarisepigRouter);
app.use('/api/welcomeEmail', welcomeEmailRouter);

// // Start bbtc cron
// scheduleMonthlyBBTC();

// start bitext cron
scheduleMonthlyBITEXT();

app.listen(port, () => {
  console.log(`\n🐷 🟢 🐷  Server running on http://localhost:${port}`);
});
