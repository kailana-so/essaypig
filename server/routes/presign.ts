import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

const router = Router();

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

router.get('/', async (req, res) => {
  const { fileName, fileType } = req.query;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'Missing fileName or fileType' });
  }

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName as string,
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
