import type { ReactNode } from 'react';
import PdfViewer from './PdfViewer';
import EpubViewer from './EpubViewer';

export type ReaderKind = 'pdf' | 'epub';

interface ReaderProps {
  kind: ReaderKind;
  // Key the EPUB bookmark is saved under: a filename for library books, a
  // resource id for essays.
  bookmarkKey: string;
  url: string;
  onClose: () => void;
  // Extra controls: library passes its "finished" toggle
  children?: ReactNode;
}

// Fullscreen overlay wrapping the viewers.
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
