import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  getPresignedUrl,
  uploadFileToS3,
  summariseBook,
  addBook,
  listBooks,
  getReadUrl,
  listBookStatuses,
  touchBook,
  setBookFinished,
} from '../services/library';
import type { Book, ReadingStatus } from '../services/library';
import Reader from '../components/Reader';
import StatusIcon, { FINISHED_GLYPH } from '../components/StatusIcon';
import '../components/ResourceList.css';
import './Library.css';

interface LibraryProps {
  user: User;
}

const Library = ({ user }: LibraryProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ReadingStatus>>({});
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ name: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const refreshBooks = useCallback(async () => {
    try {
      const [books, statuses] = await Promise.all([
        listBooks(user.uid),
        listBookStatuses(user.uid),
      ]);
      setBooks(books);
      setStatuses(statuses);
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
      const url = await getReadUrl(book.name);
      setSelectedBook({ name: book.name, url });

      // Opening is what makes a book "currently reading". Finished books keep
      // their tick
      if (statuses[book.name] !== 'finished') {
        setStatuses((current) => ({ ...current, [book.name]: 'reading' }));
      }
      await touchBook(user.uid, book.name);
    } catch (err) {
      console.error('Failed to open book:', err);
      setError("Couldn't open that one.");
    }
  };

  const toggleFinished = async (bookName: string) => {
    const finished = statuses[bookName] !== 'finished';

    setStatuses((current) => ({ ...current, [bookName]: finished ? 'finished' : 'reading' }));
    try {
      await setBookFinished(user.uid, bookName, finished);
    } catch (err) {
      console.error('Failed to save status:', err);
      await refreshBooks();
    }
  };

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
                className="resource-list__item resource-list__item--status"
                onClick={() =>
                  setExpandedName(expandedName === book.name ? null : book.name)
                }
              >
                <StatusIcon status={statuses[book.name]} />
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

      {selectedBook && (
        <Reader
          kind={selectedBook.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub'}
          bookmarkKey={selectedBook.name}
          url={selectedBook.url}
          onClose={() => setSelectedBook(null)}
        >
          <button
            onClick={() => toggleFinished(selectedBook.name)}
            className={`finished-button ${
              statuses[selectedBook.name] === 'finished' ? 'active' : ''
            }`}
            aria-pressed={statuses[selectedBook.name] === 'finished'}
            title={statuses[selectedBook.name] === 'finished' ? 'Mark as unread' : 'Mark as read'}
          >
            {FINISHED_GLYPH}
          </button>
        </Reader>
      )}
    </div>
  );
};

export default Library;
