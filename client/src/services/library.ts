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
  const response = await fetch(`/api/presign?${params}`);
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
    const response = await fetch('/api/summarypig', {
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

// Get a presigned read URL for a book
export const getReadUrl = async (userId: string, fileName: string): Promise<string> => {
  const response = await fetch(`/api/library?${new URLSearchParams({ userId, fileName })}`);
  if (!response.ok) throw new Error('Failed to get book URL');
  const { url } = await response.json();
  return url;
};

// Save reading position to Firestore
export const saveBookmark = async (bookName: string, position: string) => {
  const user = auth.currentUser;
  if (!user) return;

  await setDoc(doc(db, 'users', user.uid, 'books', bookName), { position });
};

// Load reading position from Firestore
export const loadBookmark = async (bookName: string): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const snapshot = await getDoc(doc(db, 'users', user.uid, 'books', bookName));
  return snapshot.exists() ? snapshot.data().position ?? null : null;
};
