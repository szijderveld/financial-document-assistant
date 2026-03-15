import { useState, useRef, useCallback } from 'react';
import type { ExtractedDocument, DocumentInfo } from '../lib/types';
import { uploadDocument } from '../lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (doc: DocumentInfo) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setDragActive(false);
    setUploadState('idle');
    setUploadError('');
    setExtractedDoc(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateAndSetFile = (file: File) => {
    setUploadError('');
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are accepted');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size exceeds 50MB limit');
      return;
    }
    setSelectedFile(file);
    setUploadState('idle');
    setExtractedDoc(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setUploadError('');

    try {
      const doc = await uploadDocument(selectedFile);
      setExtractedDoc(doc);
      setUploadState('success');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setUploadState('error');
    }
  };

  const handleAddDocument = () => {
    if (extractedDoc) {
      const docInfo: DocumentInfo = {
        id: extractedDoc.id,
        filename: extractedDoc.filename,
        label: extractedDoc.filename.replace(/\.pdf$/i, ''),
        shortLabel: extractedDoc.filename.slice(0, 2).toUpperCase(),
        description: `${extractedDoc.page_count} pages · ${extractedDoc.sections.length} sections`,
        company: '',
        section_count: extractedDoc.sections.length,
        page_count: extractedDoc.page_count,
      };
      onUploadComplete(docInfo);
      handleClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

        <div className="modal-body">
          {/* Drag & Drop Zone */}
          <div
            className={`modal-dropzone${dragActive ? ' active' : ''}${selectedFile ? ' has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => uploadState !== 'uploading' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div className="modal-dropzone-filled">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="modal-file-info">
                  <span className="modal-file-name">{selectedFile.name}</span>
                  <span className="modal-file-size">{formatFileSize(selectedFile.size)}</span>
                </div>
                {uploadState === 'idle' && (
                  <button
                    className="modal-dropzone-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setExtractedDoc(null);
                      setUploadError('');
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div className="modal-dropzone-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="modal-dropzone-text">
                  Drop a <strong>.pdf</strong> file here or click to browse
                </span>
                <span className="modal-dropzone-hint">Max 50MB</span>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploadState === 'uploading' && (
            <div className="modal-progress">
              <div className="modal-progress-bar">
                <div className="modal-progress-bar-fill" />
              </div>
              <span className="modal-progress-text">Uploading and extracting tables...</span>
            </div>
          )}

          {/* Extraction Results */}
          {uploadState === 'success' && extractedDoc && (
            <div className="modal-extraction-results">
              <div className="modal-extraction-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Extraction complete</span>
              </div>
              <div className="modal-extraction-stats">
                <span>{extractedDoc.page_count} page{extractedDoc.page_count !== 1 ? 's' : ''}</span>
                <span className="modal-extraction-divider">·</span>
                <span>{extractedDoc.sections.length} section{extractedDoc.sections.length !== 1 ? 's' : ''} found</span>
              </div>
              {extractedDoc.sections.length === 0 && (
                <div className="modal-warning">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>No financial tables detected in this document</span>
                </div>
              )}
              {extractedDoc.sections.length > 0 && (
                <div className="modal-section-previews">
                  {extractedDoc.sections.map((section, i) => (
                    <div key={i} className="modal-section-preview">
                      <span className="modal-section-preview-title">
                        {section.table_title || `Section ${i + 1}`}
                      </span>
                      <span className="modal-section-preview-meta">
                        {Object.keys(section.table).length} columns · {section.page_numbers.length > 0 ? `Page ${section.page_numbers.join(', ')}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {(uploadError || uploadState === 'error') && (
            <div className="modal-error">{uploadError || 'Upload failed'}</div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            {uploadState === 'idle' && selectedFile && (
              <button className="modal-submit-btn" onClick={handleUpload}>
                Upload & Extract
              </button>
            )}
            {uploadState === 'success' && extractedDoc && (
              <button className="modal-submit-btn" onClick={handleAddDocument}>
                Add Document
              </button>
            )}
            {uploadState === 'error' && (
              <button className="modal-submit-btn" onClick={handleUpload}>
                Retry Upload
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
