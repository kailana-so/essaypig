import { useEffect, useRef, useState } from 'react';
// Let Vite bundle the worker and hand pdf.js a Worker directly. Pointing
// workerSrc at the .mjs instead means nginx serves it as octet-stream — it has
// no MIME type for .mjs — and the browser refuses to run it as a module.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { saveBookmark, loadBookmark } from '../services/library';

interface PdfViewerProps {
  url: string;
  name: string;
}

// Mobile browsers only render the first page of a PDF in an iframe and won't
// scroll it. Rather than hand-roll a renderer, this uses pdf.js's own viewer
// components — the same ones behind Firefox's reader — which bring the text
// layer, pinch-zoom and page virtualisation with them. Imported dynamically so
// only readers who open a PDF pay for the library.
const PdfViewer = ({ url, name }: PdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        // The viewer's stylesheet is ~228kB, so it's pulled in here rather than
        // at module scope — no reason to ship it to people reading an EPUB
        const [pdfjs, components, savedPage] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/web/pdf_viewer.mjs'),
          loadBookmark(name).catch(() => null),
          import('pdfjs-dist/web/pdf_viewer.css'),
        ]);
        if (cancelled) return;

        pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

        const eventBus = new components.EventBus();
        const linkService = new components.PDFLinkService({ eventBus });
        const viewer = new components.PDFViewer({
          container,
          eventBus,
          linkService,
        });
        linkService.setViewer(viewer);

        eventBus.on('pagesinit', () => {
          // Fit the page to the screen — the sane default on a phone
          viewer.currentScaleValue = 'page-width';
          const page = Number(savedPage);
          if (page) viewer.currentPageNumber = page;
        });

        eventBus.on('pagechanging', (e: { pageNumber: number }) => {
          saveBookmark(name, String(e.pageNumber)).catch((err) =>
            console.error('Failed to save bookmark:', err)
          );
        });

        const loadingTask = pdfjs.getDocument({ url });
        const doc = await loadingTask.promise;
        if (cancelled) {
          loadingTask.destroy();
          return;
        }

        viewer.setDocument(doc);
        linkService.setDocument(doc, null);

        cleanup = () => {
          viewer.cleanup();
          loadingTask.destroy();
        };
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load PDF:', err);
        setError("Couldn't display that PDF.");
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [url, name]);

  return (
    <div className="pdf-wrap">
      {error && <p className="error">{error}</p>}
      {/* PDFViewer needs an absolutely positioned scroll container holding a
          .pdfViewer child, which it populates itself */}
      <div ref={containerRef} className="pdf-container">
        <div className="pdfViewer" />
      </div>
    </div>
  );
};

export default PdfViewer;
