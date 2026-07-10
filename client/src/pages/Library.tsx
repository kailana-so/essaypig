import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  getPresignedUrl,
  uploadFileToS3,
  summariseBook,
  addBook,
  listBooks,
  getReadUrl,
} from '../services/library';
import type { Book } from '../services/library';
import PdfViewer from '../components/PdfViewer';
import EpubViewer from '../components/EpubViewer';
import '../components/ResourceList.css';
import './Library.css';

interface LibraryProps {
  user: User;
}

const Library = ({ user }: LibraryProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ name: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const refreshBooks = useCallback(async () => {
    try {
      setBooks(await listBooks(user.uid));
    } catch (err) {
      console.error('Failed to load books:', err);
      setError("Couldn't fetch your books.");
    }
  }, [user]);

  useEffect(() => {
    refreshBooks();
  }, [refreshBooks]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const presignedUrl = await getPresignedUrl(user.uid, file);
      await uploadFileToS3(presignedUrl, file);
      const summary = await summariseBook(user.uid, file);
      await addBook(user.uid, file.name, summary);
      await refreshBooks();
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed, try again?');
    } finally {
      setUploading(false);
    }
  };

  const openBook = async (book: Book) => {
    setError('');
    try {
      const url = await getReadUrl(user.uid, book.name);
      setSelectedBook({ name: book.name, url });
    } catch (err) {
      console.error('Failed to open book:', err);
      setError("Couldn't open that one.");
    }
  };

  const selectedName = selectedBook?.name.toLowerCase();

  return (
    <div>
      <div className="resource-list__item library-upload">
        <input
          type="file"
          accept=".pdf,.epub"
          onChange={handleFileUpload}
          id="file-upload"
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload">
          {uploading ? 'Uploading...' : '+ Add a book'}
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="resource-list">
        <div className="resource-list__scroll">
          {books.map((book) => (
            <div key={book.name}>
              <div
                className="resource-list__item"
                onClick={() =>
                  setExpandedName(expandedName === book.name ? null : book.name)
                }
              >
                {book.title || book.name}
              </div>
              {expandedName === book.name && (
                <div className="resource-list__synopsis">
                  {book.synopsis && <p style={{ margin: '0 0 0.5rem 0' }}>{book.synopsis}</p>}
                  <button onClick={() => openBook(book)}>Read</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedBook && selectedName && (
        <div className="book-viewer">
          <button onClick={() => setSelectedBook(null)} className="close-button">
            Close
          </button>
          {selectedName.endsWith('.pdf') && <PdfViewer url={selectedBook.url} />}
          {selectedName.endsWith('.epub') && (
            <EpubViewer url={selectedBook.url} name={selectedBook.name} />
          )}
        </div>
      )}
    </div>
  );
};

export default Library;
