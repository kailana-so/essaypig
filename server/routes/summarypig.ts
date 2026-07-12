import { Router } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';
import dotenv from 'dotenv';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import pdfParse from 'pdf-parse';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { PDF_SUMMARY_PAGES, PDF_SUMMARY_CHAR_LIMIT } from '../utils/constants';

// Load .env from server directory (where it's created during deployment)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const router = Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

router.post('/', async (req, res) => {
  try {
    const { text, fileType, fileName, userId } = req.body;

    let extractedText = '';

    // Handle plain link-based string input
    if (text && typeof text === 'string') {
      const html = await fetch(text, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EssayPig/1.0)' },
      }).then(r => r.text());
      const dom = new JSDOM(html, { url: text });
      const article = new Readability(dom.window.document).parse();
      extractedText = article?.textContent?.trim() ?? text;

    // Handle an already-uploaded PDF/EPUB — the client sends only the key,
    // and we read the file from S3 rather than accepting a re-upload.
    } else if (fileName && fileType) {
      if (fileType === 'application/pdf') {
        // Same key scheme as the presign route: library uploads are
        // per-user (always under the verified uid), Gobbler uploads use
        // the flat key.
        const uid = (req as AuthedRequest).uid;
        const key = userId ? `${uid}/library/${fileName}` : (fileName as string);
        const object = await s3.send(
          new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key })
        );
        const buffer = Buffer.from(await object.Body!.transformToByteArray());
        // `max` caps the pages rendered. Don't slice pages back out of the
        // text — blank lines use the same separator, so you get paragraphs.
        const pdfData = await pdfParse(buffer, { max: PDF_SUMMARY_PAGES });
        extractedText = pdfData.text.trim().slice(0, PDF_SUMMARY_CHAR_LIMIT);

      } else if (fileType === 'application/epub+zip') {
        extractedText = fileName;
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
    } else {
      return res.status(400).json({ error: 'No valid input provided' });
    }

    const response = await fetch(`${process.env.DS_API_URL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DS_MODEL,
        messages: [
          {
            role: 'system',
            content:
              `You are EssayPig, a critical-thinking book club AI. 
You write in Australian English with expert knowledge across geopolitics, ecology, history, anthropology, economics, gender, and sexuality.

Given a text, return this exact JSON:
{
  "title": "the title of the text",
  "body": "1–2 sentences stating the title and its main argument",
  "questions": {
    "question1": "a thought-provoking question of ≤12 words",
    "question2": "a thought-provoking question of ≤12 words"
  }
}

Each question must intersect at least two domains (e.g. ecology + economics) and push toward systemic or cross-textual thinking.

Return JSON only. No markdown, no extra text.`,
          },
          {
            role: 'user',
            content: `Summarize this:\n\n${extractedText}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek API error:', errText);
      return res.status(500).json({ error: 'Failed to summarise text' });
    }

    const data = await response.json() as any;
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    const cleanContent = rawContent?.replace(/```json|```/g, '').trim();
    let summary;

    try {
      summary = JSON.parse(cleanContent || '');
    } catch (parseErr) {
      console.error('Failed to parse summary content:', parseErr);
      return res.status(500).json({ error: 'Failed to parse model response' });
    }

    return res.json({ summary, bodyText: extractedText });
  } catch (err) {
    console.error('Summary route error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
