import { useState, useRef, useCallback } from 'react';
import type { FinancialDocument } from '../lib/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (doc: FinancialDocument) => void;
}

type Tab = 'paste' | 'json';

function parseTableText(text: string): Record<string, Record<string, string | number>> | null {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;

  // Detect separator: tab or comma
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim());
  if (headers.length < 2) return null;

  // First header is the row label column; rest are data columns
  const colNames = headers.slice(1);
  const table: Record<string, Record<string, string | number>> = {};
  for (const col of colNames) {
    table[col] = {};
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim());
    if (!cells[0]) continue;
    const rowLabel = cells[0];
    for (let j = 0; j < colNames.length; j++) {
      const raw = cells[j + 1] ?? '';
      const num = Number(raw);
      table[colNames[j]][rowLabel] = isNaN(num) || raw === '' ? raw : num;
    }
  }

  return table;
}

function validateDocument(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return 'Invalid JSON object';
  const doc = obj as Record<string, unknown>;
  if (typeof doc.pre_text !== 'string') return 'Missing or invalid "pre_text" field (must be a string)';
  if (typeof doc.post_text !== 'string') return 'Missing or invalid "post_text" field (must be a string)';
  if (!doc.table || typeof doc.table !== 'object') return 'Missing or invalid "table" field (must be an object)';
  return null;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('paste');

  // Paste tab state
  const [preText, setPreText] = useState('');
  const [postText, setPostText] = useState('');
  const [tableText, setTableText] = useState('');
  const [pasteError, setPasteError] = useState('');

  // JSON tab state
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setPreText('');
    setPostText('');
    setTableText('');
    setPasteError('');
    setJsonContent('');
    setJsonError('');
    setDragActive(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePasteSubmit = () => {
    setPasteError('');
    if (!tableText.trim()) {
      setPasteError('Table data is required');
      return;
    }
    const table = parseTableText(tableText);
    if (!table || Object.keys(table).length === 0) {
      setPasteError('Could not parse table data. Use tab-separated or comma-separated format with headers in the first row.');
      return;
    }
    const doc: FinancialDocument = {
      pre_text: preText.trim(),
      post_text: postText.trim(),
      table,
    };
    onUpload(doc);
    handleClose();
  };

  const processJsonFile = (text: string) => {
    setJsonError('');
    setJsonContent(text);
    try {
      const parsed = JSON.parse(text);
      const err = validateDocument(parsed);
      if (err) {
        setJsonError(err);
      }
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  const handleJsonSubmit = () => {
    setJsonError('');
    if (!jsonContent.trim()) {
      setJsonError('Please upload or paste a JSON file');
      return;
    }
    try {
      const parsed = JSON.parse(jsonContent);
      const err = validateDocument(parsed);
      if (err) {
        setJsonError(err);
        return;
      }
      const doc: FinancialDocument = {
        pre_text: parsed.pre_text,
        post_text: parsed.post_text,
        table: parsed.table,
      };
      onUpload(doc);
      handleClose();
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      file.text().then(processJsonFile);
    } else {
      setJsonError('Please drop a .json file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      file.text().then(processJsonFile);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Upload Document</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab${activeTab === 'paste' ? ' active' : ''}`}
            onClick={() => setActiveTab('paste')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            Paste Data
          </button>
          <button
            className={`modal-tab${activeTab === 'json' ? ' active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            JSON Upload
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'paste' && (
            <div className="modal-paste-tab">
              <div className="modal-field">
                <label className="modal-label">Narrative text before the table</label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  placeholder="Enter the context that appears before the financial table..."
                  value={preText}
                  onChange={(e) => setPreText(e.target.value)}
                />
              </div>
              <div className="modal-field">
                <label className="modal-label">
                  Table data
                  <span className="modal-label-required">*</span>
                </label>
                <textarea
                  className="modal-textarea modal-textarea-table"
                  rows={6}
                  placeholder={"Label\t2024\t2023\nRevenue\t1200\t1100\nExpenses\t800\t750"}
                  value={tableText}
                  onChange={(e) => setTableText(e.target.value)}
                />
                <span className="modal-hint">Paste tab-separated or CSV table data. First row = headers, first column = row labels.</span>
              </div>
              <div className="modal-field">
                <label className="modal-label">Narrative text after the table</label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  placeholder="Enter any additional notes that appear after the table..."
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                />
              </div>
              {pasteError && <div className="modal-error">{pasteError}</div>}
              <button className="modal-submit-btn" onClick={handlePasteSubmit}>
                Load Document
              </button>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="modal-json-tab">
              <div
                className={`modal-dropzone${dragActive ? ' active' : ''}${jsonContent ? ' has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {jsonContent ? (
                  <div className="modal-dropzone-filled">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>JSON file loaded</span>
                    <button
                      className="modal-dropzone-clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        setJsonContent('');
                        setJsonError('');
                      }}
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="modal-dropzone-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="modal-dropzone-text">
                      Drop a <strong>.json</strong> file here or click to browse
                    </span>
                    <span className="modal-dropzone-hint">
                      Must contain pre_text, post_text, and table fields
                    </span>
                  </div>
                )}
              </div>
              {jsonError && <div className="modal-error">{jsonError}</div>}
              <button
                className="modal-submit-btn"
                onClick={handleJsonSubmit}
                disabled={!jsonContent}
              >
                Load Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
