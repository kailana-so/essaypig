import { Router, type RequestHandler } from 'express';

const meetingRedirect: RequestHandler = (req, res) => {
  const { code } = req.params;

  // Meet-style code sanity check (lowercase letters, digits, dashes)
  const isValid = /^[a-z0-9-]{6,64}$/.test(code);
  if (!isValid) {
    res.status(400).send('Invalid meeting code');
    return;
  }

  const qsIndex = req.url.indexOf('?');
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : '';
  const target = `https://meet.google.com/${encodeURIComponent(code)}${qs}`;

  res.setHeader('Cache-Control', 'public, max-age=300'); // optional
  res.redirect(302, target);
};

const router = Router();
router.get('/:code', meetingRedirect);

export default router;
