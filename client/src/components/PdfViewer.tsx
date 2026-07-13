import { useCallback, useEffect, useRef, useState } from 'react';
// Let Vite bundle the worker and hand pdf.js a Worker directly. Pointing
// workerSrc at the .mjs instead means nginx serves it as octet-stream — it has
// no MIME type for .mjs — and the browser refuses to run it as a module.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import type { PDFViewer } from 'pdfjs-dist/web/pdf_viewer.mjs';
import { saveBookmark, loadBookmark } from '../services/library';

// pdf.js clamps to these itself; kept here so the buttons can be disabled
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.25;

// Zoom is a reading preference, not a property of one book — keep it across
// books and sessions, but locally: no reason to write to Firestore on a tap.
const ZOOM_KEY = 'pdf-zoom';

interface PdfViewerProps {
  url: string;
  name: string;
}

// Mobile browsers only render the first page of a PDF in an iframe and won't
// scroll it. Rather than hand-roll a renderer, this uses pdf.js's own viewer
// components — the same ones behind Firefox's reader — which bring the text
// layer and page virtualisation with them. Imported dynamically so only readers
// who open a PDF pay for the library.
const PdfViewer = ({ url, name }: PdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PDFViewer | null>(null);
  const [scale, setScale] = useState(0);
  const [error, setError] = useState('');

  const zoom = useCallback((factor: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const next = Math.min(Math.max(viewer.currentScale * factor, MIN_SCALE), MAX_SCALE);
    viewer.currentScale = next;
    localStorage.setItem(ZOOM_KEY, String(next));
  }, []);

  // Back to fitting the page across the screen
  const resetZoom = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.currentScaleValue = 'page-width';
    localStorage.removeItem(ZOOM_KEY);
  }, []);

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
        viewerRef.current = viewer;

        eventBus.on('pagesinit', () => {
          const savedZoom = Number(localStorage.getItem(ZOOM_KEY));
          // Fitting the page across the screen is the sane default, but a whole
          // A4 page squeezed onto a phone is tiny — so a chosen zoom wins.
          if (savedZoom) viewer.currentScale = savedZoom;
          else viewer.currentScaleValue = 'page-width';

          const page = Number(savedPage);
          if (page) viewer.currentPageNumber = page;
        });

        // Keeps the readout and the button states honest, however scale changed
        eventBus.on('scalechanging', (e: { scale: number }) => setScale(e.scale));

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
          viewerRef.current = null;
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
    <>
      <div className="pdf-wrap">
        {error && <p className="error">{error}</p>}
        {/* PDFViewer needs an absolutely positioned scroll container holding a
            .pdfViewer child, which it populates itself */}
        <div ref={containerRef} className="pdf-container">
          <div className="pdfViewer" />
        </div>
      </div>

      {!error && (
        <div className="pdf-nav">
          <button onClick={() => zoom(1 / ZOOM_STEP)} disabled={scale <= MIN_SCALE}>
            − zoom out
          </button>
          <button onClick={resetZoom} title="Fit the page to the screen">
            {scale ? `${Math.round(scale * 100)}%` : 'fit'}
          </button>
          <button onClick={() => zoom(ZOOM_STEP)} disabled={scale >= MAX_SCALE}>
            zoom in +
          </button>
        </div>
      )}
    </>
  );
};

export default PdfViewer;
