import { Router } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Load .env from server directory (where it's created during deployment)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const router = Router();
const upload = multer();

router.post('/', upload.single('file') as any, async (req, res) => {
  try {
    const { text, fileType, fileName } = req.body;
    const file = req.file;

    let extractedText = '';

    // Handle plain link-based string input
    if (text && typeof text === 'string') {
      const html = await fetch(text, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EssayPig/1.0)' },
      }).then(r => r.text());
      const dom = new JSDOM(html, { url: text });
      const article = new Readability(dom.window.document).parse();
      extractedText = article?.textContent?.trim() ?? text;

    // Handle PDF/EPUB file
    } else if (file && fileType) {
      if (fileType === 'application/pdf') {
        const pdfData = await pdfParse(file.buffer);
        const pages = pdfData.text.split('\n\n');
        extractedText = pages.slice(0, 3).join('\n\n'); // First ~3 pages

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
