import { Router } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';
import dotenv from 'dotenv';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

import { titleFromUrl } from '../utils/titleFromUrl';
import { assertPublicUrl } from '../utils/safeUrl';
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

interface SummaryResponse {
  title: string;
  synopsis: string;
  status: string | null;
  summary: string | null;
}

/**
 * Tier 1: Fetch the page and extract readable text via Readability.
 * Returns null on any failure (bot wall, non-HTML, timeout, etc.)
 */
async function tryFetchAndExtract(url: string): Promise<{ title: string; body: string } | null> {
  try {
    await assertPublicUrl(url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/html')) return null;

    const html = await response.text();
    if (!html.trim()) return null;

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.length < 50) return null;

    return {
      title: article.title || titleFromUrl(url),
      body: article.textContent,
    };
  } catch {
    return null;
  }
}

/**
 * Tier 2: Ask DeepSeek to summarise using the raw URL.
 */
async function trySummariseUrl(url: string): Promise<SummaryResponse | null> {
  try {
    const res = await callDeepSeek(url);
    return parseDeepSeekResponse(res);
  } catch {
    return null;
  }
}

/**
 * Tier 3: Mechanical fallback — no LLM. Derive title from URL, empty body.
 */
function makeFallbackSummary(url: string): SummaryResponse {
  return {
    title: titleFromUrl(url),
    synopsis: '',
    status: null,
    summary: null,
  };
}

async function callDeepSeek(promptText: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful summariser that returns JSON with exactly these keys: title, synopsis, readingStatus, and questions.' +
            '"readingStatus" MUST be one of: "later", "undecided", "current", "finished"' +
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

function parseDeepSeekResponse(content: string): SummaryResponse {
  const json = JSON.parse(content);
  if (!json.title) throw new Error('Missing title in response');
  return {
    title: json.title,
    synopsis: json.synopsis ?? '',
    status: json.readingStatus ?? null,
    summary: json.questions ?? '',
  };
}

function resolveTitle(resource: string, fallbackTitle: string | null): string {
  if (fallbackTitle) return fallbackTitle;
  try {
    new URL(resource);
    return titleFromUrl(resource);
  } catch {
    return resource;
  }
}

// POST /api/summarypig
router.post('/', async (req: AuthedRequest, res) => {
  const { text: resource, fileName, fileType } = req.body;
  const isLink = fileType === 'link';

  if (isLink) {
    // ─── LINK: three-tier fallback ─────────────────────────────────────
    let summary: SummaryResponse | null = null;
    let bodyText: string | null = null;

    // Tier 1: Fetch page, extract via Readability
    const extracted = await tryFetchAndExtract(resource);
    if (extracted) {
      try {
        const result = await callDeepSeek(extracted.body);
        summary = parseDeepSeekResponse(result);
        bodyText = extracted.body;
      } catch {
        summary = null; // Fall through to Tier 2
      }
    }

    // Tier 2: Pass raw URL to LLM
    if (!summary) {
      summary = await trySummariseUrl(resource);
    }

    // Tier 3: Mechanical fallback
    if (!summary) {
      summary = makeFallbackSummary(resource);
    }

    const title = summary.title || resolveTitle(resource, null);

    res.json({
      summary: {
        title,
        body: summary.synopsis,
        status: summary.status,
        questions: summary.summary,
      },
      bodyText,
    });
  } else {
    // ─── FILE: unchanged S3 pipeline ───────────────────────────────────
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
      headers: {
        'Content-Type': fileType,
      },
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
      const summaryResult = await callDeepSeek(text);
      const json = JSON.parse(summaryResult);

      const uid = req.uid;

      res.json({
        summary: {
          title: json.title ?? resolveTitle(resource, fileName),
          body: json.synopsis ?? null,
          status: json.readingStatus ?? null,
          questions: json.questions ?? null,
        },
      });
    } catch (err) {
      console.error('Failed to summarise text:', err);
      res.status(500).json({ error: 'Failed to summarise text' });
    }
  }
});

export default router;
