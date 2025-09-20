import { Router, type RequestHandler } from 'express';

const meetingRedirect: RequestHandler = (req, res) => {
  const { code } = req.params;

  const isValid = /^[a-z0-9-]{6,64}$/.test(code);
  if (!isValid) {
    res.status(400).send('Invalid meeting code');
    return;
  }

  const qsIndex = req.url.indexOf('?');
  const qs = qsIndex >= 0 ? req.url.slice(qsIndex) : '';
  const target = `https://meet.google.com/${encodeURIComponent(code)}${qs}`;

  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.redirect(302, target);
};

const router = Router();
router.get('/:code', meetingRedirect);

export default router;
