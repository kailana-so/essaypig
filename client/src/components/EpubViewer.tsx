import { useEffect, useRef } from 'react';
import ePub from 'epubjs';
import type { Rendition, Location } from 'epubjs';
import { saveBookmark, loadBookmark } from '../services/library';

interface EpubViewerProps {
  url: string;
  name: string;
}

const EpubViewer = ({ url, name }: EpubViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const book = ePub(url);
    const rendition = book.renderTo(containerRef.current, {
      width: '100%',
      height: '100%',
    });
    renditionRef.current = rendition;

    // Resume from the saved position if there is one
    loadBookmark(name)
      .catch(() => null)
      .then((position) => rendition.display(position ?? undefined))
      .catch((error) => console.error('Failed to load EPUB:', error));

    rendition.on('relocated', (location: Location) => {
      saveBookmark(name, location.start.cfi).catch((error) =>
        console.error('Failed to save bookmark:', error)
      );
    });

    return () => {
      renditionRef.current = null;
      book.destroy();
    };
  }, [url, name]);

  return (
    <div className="epub-viewer">
      <div ref={containerRef} className="epub-container" />
      <div className="epub-nav">
        <button onClick={() => renditionRef.current?.prev()}>‹ prev</button>
        <button onClick={() => renditionRef.current?.next()}>next ›</button>
      </div>
    </div>
  );
};

export default EpubViewer;
