import { Router } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { buildKey, isSafeName } from '../utils/keys';

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

// Returns a presigned read URL for a book in the user's library
router.get('/', async (req, res) => {
  const { fileName } = req.query;
  const uid = (req as AuthedRequest).uid!;

  if (!fileName || typeof fileName !== 'string' || !isSafeName(fileName)) {
    return res.status(400).json({ error: 'Missing or invalid fileName' });
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: buildKey('library', uid, fileName),
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return res.json({ url });
  } catch (err) {
    console.error('Library presign error:', err);
    return res.status(500).json({ error: 'Couldn\'t generate URL' });
  }
});

export default router;
