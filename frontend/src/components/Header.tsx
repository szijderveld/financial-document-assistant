interface HeaderProps {
  documentTitle: string;
  selectedModel: string;
  onModelChange: () => void;
  onUpload: () => void;
}

export default function Header({
  documentTitle,
  selectedModel,
  onModelChange,
  onUpload,
}: HeaderProps) {
  const modelLabel = selectedModel === 'llama-3.3-70b' ? 'Llama 3.3 70B' : 'Llama 3.1 8B';

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span className="logo-text">FinDoc AI</span>
          </div>
          <div className="header-separator" />
          <span className="header-doc-title truncate">{documentTitle}</span>
        </div>

        <div className="header-right">
          <button className="model-selector" onClick={onModelChange}>
            <span className="model-dot" />
            <span className="model-name">{modelLabel}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <button className="header-btn" onClick={onUpload} title="Upload document">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>

          <div className="header-avatar" title="SZ">SZ</div>
        </div>
      </div>
    </header>
  );
}
