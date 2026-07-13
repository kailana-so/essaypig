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
        // pdf_viewer.mjs has no imports of its own — it reads globalThis.pdfjsLib,
        // which pdf.mjs sets as a side effect when it evaluates. So it has to be
        // loaded strictly AFTER, never alongside: they end up in separate chunks
        // and nothing else orders them.
        const pdfjs = await import('pdfjs-dist');

        // These have no such constraint. The stylesheet is ~200kB, so it stays
        // here rather than at module scope — no reason to ship it to EPUB readers.
        const [components, savedPage] = await Promise.all([
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
