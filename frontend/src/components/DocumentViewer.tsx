import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import FinancialTable from './FinancialTable';
import DocumentSelector from './DocumentSelector';
import type { SampleDocument } from '../lib/types';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface ExtractedSectionInfo {
  table_title: string;
  page_numbers: number[];
  table: Record<string, Record<string, string | number>>;
  pre_text: string;
  post_text: string;
}

interface DocumentViewerProps {
  documentId: string | null;
  pdfUrl: string | null;
  sections: ExtractedSectionInfo[];
  selectedSectionIndex: number;
  onSelectSection: (index: number) => void;
  documents: SampleDocument[];
  selectedIndex: number;
  onSelectDocument: (index: number) => void;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  onUpload: () => void;
}

function DocumentViewer({
  pdfUrl,
  sections,
  selectedSectionIndex,
  onSelectSection,
  documents,
  selectedIndex,
  onSelectDocument,
  onToggleSidebar,
  onToggleChat,
  onUpload,
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [sectionsExpanded, setSectionsExpanded] = useState(false);
  const [extractedDataExpanded, setExtractedDataExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const zoomIn = () => setZoom((z) => Math.min(z + 10, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 50));
  const zoomReset = () => setZoom(100);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setPdfError(error.message || 'Failed to load PDF');
    setPdfLoading(false);
  }, []);

  // Reset state when PDF changes
  useEffect(() => {
    setCurrentPage(1);
    setNumPages(0);
    setPdfError(null);
    setPdfLoading(true);
  }, [pdfUrl]);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages));
    setCurrentPage(clamped);
    const el = pageRefs.current.get(clamped);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSectionClick = (index: number) => {
    onSelectSection(index);
    const section = sections[index];
    if (section?.page_numbers?.length > 0) {
      goToPage(section.page_numbers[0]);
    }
  };

  // Track current page on scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || numPages === 0) return;
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    let closestPage = 1;
    let closestDistance = Infinity;

    pageRefs.current.forEach((el, pageNum) => {
      const rect = el.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = pageNum;
      }
    });

    setCurrentPage(closestPage);
  }, [numPages]);

  const selectedSection = sections[selectedSectionIndex] ?? null;
  const scale = zoom / 100;

  return (
    <div className="doc-viewer">
      {/* Toolbar */}
      <div className="doc-viewer-toolbar">
        <div className="doc-viewer-toolbar-left">
          <button
            className="doc-viewer-toolbar-btn"
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
          <DocumentSelector
            documents={documents}
            selectedIndex={selectedIndex}
            onSelect={onSelectDocument}
            onUpload={onUpload}
          />
        </div>
        <div className="doc-viewer-toolbar-right">
          {/* Page navigation */}
          {numPages > 0 && (
            <div className="page-nav">
              <button
                className="page-nav-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                title="Previous page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="page-nav-label">
                Page {currentPage} of {numPages}
              </span>
              <button
                className="page-nav-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages}
                title="Next page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= 50}
              title="Zoom out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              className="zoom-label"
              onClick={zoomReset}
              title="Reset zoom"
            >
              {zoom}%
            </button>
            <button
              className="zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= 200}
              title="Zoom in"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Sections toggle */}
          {sections.length > 0 && (
            <button
              className={`doc-viewer-toolbar-btn${sectionsExpanded ? ' active' : ''}`}
              onClick={() => setSectionsExpanded((e) => !e)}
              title="Toggle sections panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
            </button>
          )}

          <button
            className="doc-viewer-toolbar-btn"
            onClick={onToggleChat}
            title="Toggle chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="doc-viewer-body">
        {/* Sections sidebar panel */}
        {sectionsExpanded && sections.length > 0 && (
          <div className="doc-sections-panel">
            <div className="doc-sections-header">
              <span className="doc-sections-title">Extracted Sections</span>
              <span className="doc-sections-count">{sections.length}</span>
            </div>
            <div className="doc-sections-list">
              {sections.map((section, index) => (
                <button
                  key={index}
                  className={`doc-section-item${index === selectedSectionIndex ? ' active' : ''}`}
                  onClick={() => handleSectionClick(index)}
                >
                  <div className="doc-section-item-number">{index + 1}</div>
                  <div className="doc-section-item-info">
                    <span className="doc-section-item-title">
                      {section.table_title || `Table ${index + 1}`}
                    </span>
                    {section.page_numbers.length > 0 && (
                      <span className="doc-section-item-pages">
                        Page {section.page_numbers.join(', ')}
                      </span>
                    )}
                  </div>
                  {index === selectedSectionIndex && (
                    <svg className="doc-section-item-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PDF viewer */}
        <div className="doc-viewer-scroll" ref={scrollRef} onScroll={handleScroll}>
          {pdfUrl ? (
            <>
              {pdfLoading && (
                <div className="doc-viewer-loading">
                  <div className="doc-viewer-spinner" />
                  <p>Loading PDF...</p>
                </div>
              )}

              {pdfError && (
                <div className="doc-viewer-error">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p>Failed to load PDF</p>
                  <span className="doc-viewer-error-detail">{pdfError}</span>
                </div>
              )}

              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
              >
                <div className="pdf-pages-container">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                    <div
                      key={pageNum}
                      className="pdf-page-wrapper"
                      ref={(el) => {
                        if (el) pageRefs.current.set(pageNum, el);
                        else pageRefs.current.delete(pageNum);
                      }}
                    >
                      <Page
                        pageNumber={pageNum}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                      <div className="pdf-page-number">
                        Page {pageNum} of {numPages}
                      </div>
                    </div>
                  ))}
                </div>
              </Document>
            </>
          ) : (
            <div className="doc-viewer-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p>Select a document to view</p>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Data collapsible panel */}
      {selectedSection && (
        <div className={`doc-extracted-panel${extractedDataExpanded ? ' expanded' : ''}`}>
          <button
            className="doc-extracted-toggle"
            onClick={() => setExtractedDataExpanded((e) => !e)}
          >
            <svg
              className={`doc-extracted-chevron${extractedDataExpanded ? ' open' : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>Extracted Data — {selectedSection.table_title || `Table ${selectedSectionIndex + 1}`}</span>
            <span className="doc-extracted-badge">
              {Object.keys(selectedSection.table).length} columns
            </span>
          </button>
          {extractedDataExpanded && (
            <div className="doc-extracted-content">
              {selectedSection.pre_text && (
                <div className="doc-extracted-text">
                  <span className="doc-extracted-text-label">Context (before table)</span>
                  <p>{selectedSection.pre_text}</p>
                </div>
              )}
              <FinancialTable table={selectedSection.table} />
              {selectedSection.post_text && (
                <div className="doc-extracted-text">
                  <span className="doc-extracted-text-label">Context (after table)</span>
                  <p>{selectedSection.post_text}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating chat toggle */}
      <button
        className="doc-viewer-chat-fab"
        onClick={onToggleChat}
        title="Open chat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}

export default DocumentViewer;
