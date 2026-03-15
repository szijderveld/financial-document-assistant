import { useState, useRef, useEffect } from 'react';
import type { SampleDocument } from '../lib/types';

interface DocumentSelectorProps {
  documents: SampleDocument[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onUpload: () => void;
}

function DocumentSelector({
  documents,
  selectedIndex,
  onSelect,
  onUpload,
}: DocumentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = documents[selectedIndex];
  const displayLabel = selected?.label ?? 'Select document';

  return (
    <div className="doc-selector" ref={ref}>
      <button
        className="doc-selector-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="doc-selector-label truncate">{displayLabel}</span>
        <svg
          className={`doc-selector-chevron${open ? ' open' : ''}`}
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
      </button>

      {open && (
        <div className="doc-selector-dropdown animate-fade-in">
          <div className="doc-selector-list">
            {documents.map((doc, index) => (
              <button
                key={doc.id}
                className={`doc-selector-item${index === selectedIndex ? ' active' : ''}`}
                onClick={() => {
                  onSelect(index);
                  setOpen(false);
                }}
              >
                <span className="doc-selector-item-abbr">{doc.shortLabel}</span>
                <div className="doc-selector-item-text">
                  <span className="doc-selector-item-name">{doc.label}</span>
                  <span className="doc-selector-item-desc">{doc.description}</span>
                </div>
                {index === selectedIndex && (
                  <svg
                    className="doc-selector-check"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="doc-selector-footer">
            <button
              className="doc-selector-upload-btn"
              onClick={() => {
                onUpload();
                setOpen(false);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload your own document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentSelector;
