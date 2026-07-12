import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { authedFetch } from './api';

export type ReadingStatus = 'reading' | 'finished';

export interface Book {
  name: string;
  title?: string;
  synopsis?: string;
}

export interface BookSummary {
  title?: string;
  body?: string;
}

// Get presigned URL for S3 upload, keyed under the user's library
export const getPresignedUrl = async (userId: string, file: File): Promise<string> => {
  const params = new URLSearchParams({
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    userId,
  });
  const response = await authedFetch(`/api/presign?${params}`);
  if (!response.ok) throw new Error('Failed to get presigned URL');
  const { url } = await response.json();
  return url;
};

// Upload file to S3 using presigned URL
export const uploadFileToS3 = async (url: string, file: File) => {
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });
  if (!response.ok) throw new Error('Failed to upload file');
};

// Ask DeepSeek (via the summarypig route) for a title and summary.
// The file is already in S3 by this point, so we only send its key —
// the server fetches it from the bucket itself.
// Best-effort: a failed summary shouldn't block the upload.
export const summariseBook = async (userId: string, file: File): Promise<BookSummary | null> => {
  try {
    const response = await authedFetch('/api/summarypig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
      }),
    });
    if (!response.ok) return null;
    const { summary } = await response.json();
    return summary ?? null;
  } catch (err) {
    console.error('Summary failed:', err);
    return null;
  }
};

// Record an uploaded book in Firestore
export const addBook = async (userId: string, fileName: string, summary?: BookSummary | null) => {
  await setDoc(doc(db, 'users', userId, 'library', fileName), {
    name: fileName,
    title: summary?.title ?? null,
    synopsis: summary?.body ?? null,
    uploadedAt: serverTimestamp(),
  });
};

// List the user's books from Firestore
export const listBooks = async (userId: string): Promise<Book[]> => {
  const snapshot = await getDocs(
    query(collection(db, 'users', userId, 'library'), orderBy('uploadedAt', 'desc'))
  );
  return snapshot.docs.map((d) => ({
    name: d.get('name') as string,
    title: (d.get('title') as string | null) ?? undefined,
    synopsis: (d.get('synopsis') as string | null) ?? undefined,
  }));
};

// A doc exists once the book has been opened, so presence means "reading"
export const listBookStatuses = async (
  userId: string
): Promise<Record<string, ReadingStatus>> => {
  const snapshot = await getDocs(collection(db, 'users', userId, 'books'));

  const statuses: Record<string, ReadingStatus> = {};
  for (const d of snapshot.docs) {
    statuses[d.id] = d.get('finished') === true ? 'finished' : 'reading';
  }
  return statuses;
};

// Record that a book has been opened — the only signal PDFs and EPUBs share
export const touchBook = async (userId: string, bookName: string) => {
  await setDoc(
    doc(db, 'users', userId, 'books', bookName),
    { openedAt: serverTimestamp() },
    { merge: true }
  );
};

export const setBookFinished = async (
  userId: string,
  bookName: string,
  finished: boolean
) => {
  await setDoc(doc(db, 'users', userId, 'books', bookName), { finished }, { merge: true });
};

// Get a presigned read URL for a book (scoped to the signed-in user server-side)
export const getReadUrl = async (fileName: string): Promise<string> => {
  const response = await authedFetch(`/api/library?${new URLSearchParams({ fileName })}`);
  if (!response.ok) throw new Error('Failed to get book URL');
  const { url } = await response.json();
  return url;
};

// Save reading position to Firestore. Merged so a page turn doesn't wipe the
// finished flag sharing this doc.
export const saveBookmark = async (bookName: string, position: string) => {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, 'users', user.uid, 'books', bookName), { position }, { merge: true });
};

// Load reading position from Firestore
export const loadBookmark = async (bookName: string): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const snapshot = await getDoc(doc(db, 'users', user.uid, 'books', bookName));
  return snapshot.exists() ? snapshot.data().position ?? null : null;
};
