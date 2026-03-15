import { useState } from 'react';
import FinancialTable from './FinancialTable';
import DocumentSelector from './DocumentSelector';
import type { FinancialDocument, SampleDocument } from '../lib/types';

interface DocumentMeta {
  company: string;
  shortLabel: string;
  subtitle: string;
}

interface DocumentViewerProps {
  document: FinancialDocument | null;
  documentMeta: DocumentMeta | null;
  documents: SampleDocument[];
  selectedIndex: number;
  onSelectDocument: (index: number) => void;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  onUpload: () => void;
}

function DocumentViewer({
  document,
  documentMeta,
  documents,
  selectedIndex,
  onSelectDocument,
  onToggleSidebar,
  onToggleChat,
  onUpload,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);

  const zoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 50));
  const zoomReset = () => setZoom(100);

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
              disabled={zoom >= 150}
              title="Zoom in"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
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

      {/* Document content */}
      <div className="doc-viewer-scroll">
        {document && documentMeta ? (
          <div
            className="doc-page"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Company header */}
            <div className="doc-page-header">
              <span className="doc-page-header-icon">{documentMeta.shortLabel}</span>
              <div className="doc-page-header-text">
                <h2 className="doc-page-company">{documentMeta.company}</h2>
                <span className="doc-page-subtitle">{documentMeta.subtitle}</span>
              </div>
            </div>

            {/* Narrative Context */}
            {document.pre_text && (
              <section className="doc-page-section">
                <h3 className="doc-page-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Narrative Context
                </h3>
                <p className="doc-page-text">{document.pre_text}</p>
              </section>
            )}

            {/* Financial Data */}
            {document.table && Object.keys(document.table).length > 0 && (
              <section className="doc-page-section">
                <h3 className="doc-page-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  Financial Data
                </h3>
                <FinancialTable table={document.table} />
              </section>
            )}

            {/* Additional Notes */}
            {document.post_text && (
              <section className="doc-page-section">
                <h3 className="doc-page-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Additional Notes
                </h3>
                <p className="doc-page-text">{document.post_text}</p>
              </section>
            )}

            {/* Page footer */}
            <div className="doc-page-footer">
              <span>Page 1 of 1</span>
            </div>
          </div>
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

      {/* Floating chat toggle (shown when chat is collapsed) */}
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
