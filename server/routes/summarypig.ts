import { Router } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';
import dotenv from 'dotenv';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { titleFromUrl } from '../utils/titleFromUrl';
import { buildKey } from '../utils/keys';
import pdfParse from 'pdf-parse';
import EPub from 'epub';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  region: process.env.AWS_REGION || '',
});

const BUCKET = process.env.AWS_BUCKET_NAME || '';

const router = Router();

interface LLMQuestions {
  question1: string;
  question2: string;
}

interface LLMResponse {
  title: string;
  body: string;
  questions: LLMQuestions;
}

async function callLLM(promptText: string): Promise<LLMResponse> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://essaypig.com',
      'X-Title': 'Essay Pig',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      provider: { allow_fallbacks: true },
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You love summarising texts into 1–2 sentence descriptions including the title of the text and 2 questions. Questions should be concise (max 12 words), clever or funny and raise new viewpoints on the text or author. Return JSON format with "title", "body", "questions": { "question1", "question2" } keys. Include nothing else.',
        },
        {
          role: 'user',
          content: `Summarize this:\n\n${promptText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  const json = JSON.parse(content);

  const questions: LLMQuestions = {
    question1: json.questions?.question1 || '',
    question2: json.questions?.question2 || '',
  };

  return {
    title: json.title || '',
    body: json.body || '',
    questions,
  };
}

function makeFallbackSummary(title: string): LLMResponse {
  return {
    title,
    body: '',
    questions: { question1: '', question2: '' },
  };
}

async function extractTextFromBuffer(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType === 'application/pdf') {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }

  if (fileType === 'application/epub+zip') {
    const epub = new EPub(buffer, '', '');
    await epub.parse();

    let text = '';
    for (const item of epub.flow) {
      const html = await epub.getChapter(item.id);
      const textOnly = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      text += textOnly + ' ';
    }
    return text.trim();
  }

  return buffer.toString('utf-8');
}

// POST /api/summarypig
router.post('/', async (req: AuthedRequest, res) => {
  const { text: resource, fileName, fileType } = req.body;
  const isLink = fileType === 'link';

  // ─── LINKS ─────────────────────────────────────────────────────────
  if (isLink) {
    try {
      const summary = await callLLM(resource);
      res.json({
        summary: {
          title: summary.title || titleFromUrl(resource),
          body: summary.body || '',
          questions: summary.questions,
        },
      });
    } catch (err) {
      console.error('OpenRouter failed for link:', err);
      res.json({ summary: makeFallbackSummary(titleFromUrl(resource)) });
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

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const text = await extractTextFromBuffer(buffer, fileType);

  if (!text.trim()) {
    res.status(500).json({ error: 'File returned by S3 is empty or could not be parsed' });
    return;
  }

  try {
    const summary = await callLLM(text);
    res.json({
      summary: {
        title: summary.title || decodedFileName,
        body: summary.body || '',
        questions: summary.questions,
      },
    });
  } catch (err) {
    console.error('OpenRouter failed for file:', err);
    res.json({ summary: makeFallbackSummary(decodedFileName) });
  }
});

export default router;
