
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import cors from 'cors';
import presignRouter from './routes/presign';
import libraryRouter from './routes/library';
import summarisepigRouter from './routes/summarypig';
import welcomeEmailRouter from './routes/welcomeEmail';
import meetRouter from './routes/meetingRedirect';
import resourcesRouter from './routes/resources';
import { sendNewTextNK } from './jobs/nkScheduler';
import { test_sendNewTextNK } from './jobs/testScheduler';
import { requireAuth } from './middleware/requireAuth';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/m', meetRouter);
app.use('/api/presign', requireAuth, presignRouter);
app.use('/api/library', requireAuth, libraryRouter);
app.use('/api/summarypig', requireAuth, summarisepigRouter);
app.use('/api/welcomeEmail', requireAuth, welcomeEmailRouter);
app.use('/api/resources', resourcesRouter);

// if (process.env.NODE_ENV === 'development') {
//   test_sendNewTextNK();
// } 
if (process.env.NODE_ENV !== 'development') {
  sendNewTextNK();
}

app.listen(port, () => {
  console.log(`\n🐷 🟢 🐷  Server running on http://localhost:${port}`);
});
