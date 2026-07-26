import { Router } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';
import dotenv from 'dotenv';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { titleFromUrl } from '../utils/titleFromUrl';
import { buildKey } from '../utils/keys';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  region: process.env.AWS_REGION || '',
});

const BUCKET = process.env.S3_RESOURCES_BUCKET || '';

const router = Router();

async function callDeepSeek(promptText: string): Promise<string> {
  const res = await fetch(process.env.DS_API_URL || 'https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.DS_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful summariser that returns JSON with exactly these keys: title, synopsis, readingStatus, and questions. ' +
            '"readingStatus" MUST be one of: "later", "undecided", "current", "finished". ' +
            'Only return the JSON object, no markdown or explanation.',
        },
        {
          role: 'user',
          content: `Produce a one-paragraph summary of text starting with its title. Return JSON only.
Title: "Readability scores how important it was overall"
{ "synopsis": "", "readingStatus": "undecided", "questions": "" }. TEXTSTARTSHERE: ${promptText}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek returned ${res.status}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// POST /api/summarypig
router.post('/', async (req: AuthedRequest, res) => {
  const { text: resource, fileName, fileType } = req.body;
  const isLink = fileType === 'link';

  // ─── LINKS ─────────────────────────────────────────────────────────
  if (isLink) {
    try {
      const raw = await callDeepSeek(resource);
      const json = JSON.parse(raw);

      res.json({
        summary: {
          title: json.title ?? titleFromUrl(resource),
          body: json.synopsis ?? '',
          status: json.readingStatus ?? 'undecided',
          questions: json.questions ?? '',
        },
      });
    } catch (err) {
      console.error('DeepSeek failed for link:', err);
      // Fallback: still return 200 with slug title so the client doesn't crash
      res.json({
        summary: {
          title: titleFromUrl(resource),
          body: '',
          status: 'undecided',
          questions: '',
        },
      });
    }
    return;
  }

  // ─── FILES ─────────────────────────────────────────────────────────
  if (!fileName) {
    res.status(400).json({ error: 'fileName is required' });
    return;
  }
  if (!req.uid) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const decodedFileName = decodeURIComponent(fileName);
  const key = buildKey('library', req.uid, decodedFileName);

  const getCommand = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, getCommand, { expiresIn: 300 });

  const response = await fetch(url, {
    headers: { 'Content-Type': fileType },
    method: 'GET',
  });

  if (!response.ok) {
    res.status(500).json({ error: 'Failed to fetch file from S3' });
    return;
  }

  const text = await response.text();
  if (!text) {
    res.status(500).json({ error: 'File returned by S3 is empty' });
    return;
  }

  try {
    const raw = await callDeepSeek(text);
    const json = JSON.parse(raw);

    res.json({
      summary: {
        title: json.title ?? decodedFileName,
        body: json.synopsis ?? '',
        status: json.readingStatus ?? 'undecided',
        questions: json.questions ?? '',
      },
    });
  } catch (err) {
    console.error('Failed to summarise text:', err);
    res.status(500).json({ error: 'Failed to summarise text' });
  }
});

export default router;
