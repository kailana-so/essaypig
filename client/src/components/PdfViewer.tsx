interface PdfViewerProps {
  url: string;
}

// Browsers render PDFs natively (with paging, zoom and search), so an
// iframe avoids pulling in pdf.js.
const PdfViewer = ({ url }: PdfViewerProps) => (
  <iframe src={url} title="PDF viewer" className="pdf-container" />
);

export default PdfViewer;
