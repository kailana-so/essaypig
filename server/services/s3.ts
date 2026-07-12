import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory (where it's created during deployment)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const presignRead = (key: string, expiresIn = 3600) =>
  getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }),
    { expiresIn }
  );
