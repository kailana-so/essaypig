import { Router } from 'express';
import type { AuthedRequest } from '../middleware/requireAuth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { buildKey, isSafeName, resolveScope } from '../utils/keys';

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

router.get('/', async (req, res) => {
  const { fileName, fileType, userId, scope } = req.query;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing fileName or fileType' });
  }

  if (typeof fileName !== 'string' || !isSafeName(fileName)) {
    return res.status(400).json({ error: 'Invalid fileName' });
  }

  const uid = (req as AuthedRequest).uid!;
  const key = buildKey(resolveScope(scope, userId), uid, fileName);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: fileType as string,
    ACL: 'private',
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    return res.json({ url });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: 'Couldn\'t generate URL' });
  }
});

export default router;
