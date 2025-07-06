import express from 'express';
import { welcomeEmail } from '../email/welcomeEmail';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, group } = req.body;

  console.log('Sending welcome email for group', group);
  try {
    await welcomeEmail(email, group);
    res.status(200).json({ message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
