import type { ReactNode } from 'react';
import PdfViewer from './PdfViewer';
import EpubViewer from './EpubViewer';

export type ReaderKind = 'pdf' | 'epub';

interface ReaderProps {
  kind: ReaderKind;
  // Key the EPUB bookmark is saved under: a filename for library books, a
  // resource id for essays. Keeping them distinct stops an essay and a book of
  // the same filename sharing a reading position.
  bookmarkKey: string;
  url: string;
  onClose: () => void;
  // Extra controls for the top bar — the library passes its "finished" toggle
  children?: ReactNode;
}

// Fullscreen overlay wrapping the viewers. Shared by the library and by essays
// that live in the bucket (link essays open at the source instead).
const Reader = ({ kind, bookmarkKey, url, onClose, children }: ReaderProps) => (
  <div className="book-viewer">
    <div className="book-viewer__bar">
      {children}
      <button onClick={onClose} className="close-button">
        Close
      </button>
    </div>
    {kind === 'pdf' ? (
      <PdfViewer url={url} />
    ) : (
      <EpubViewer url={url} name={bookmarkKey} />
    )}
  </div>
);

export default Reader;
