import path from 'path';

// Builds every S3 key server-side from the verified uid; the client never
// supplies a key. basename() strips any path smuggled into the file name.

export type UploadScope = 'library' | 'resource';

const bareName = (fileName: string) => path.basename(fileName);

export const isSafeName = (fileName: string) => {
  const name = bareName(fileName);
  return name !== '' && name !== '.' && name !== '..';
};

// Private, per-user.
const libraryKey = (uid: string, fileName: string) =>
  `${uid}/library/${bareName(fileName)}`;

// Group essays: shared, flat at the bucket root.
const resourceKey = (fileName: string) => bareName(fileName);

export const buildKey = (scope: UploadScope, uid: string, fileName: string) =>
  scope === 'library' ? libraryKey(uid, fileName) : resourceKey(fileName);

// `userId` is the legacy scope flag, kept for cached clients that predate `scope`.
export const resolveScope = (scope: unknown, legacyUserId: unknown): UploadScope =>
  scope === 'library' || (scope === undefined && Boolean(legacyUserId))
    ? 'library'
    : 'resource';
