import { useState, useMemo } from 'react';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import DocumentViewer from './components/DocumentViewer';
import ChatPanel from './components/ChatPanel';
import UploadModal from './components/UploadModal';
import { useDocuments } from './hooks/useDocuments';
import { useChat } from './hooks/useChat';
import type { ConversationItem, FinancialDocument } from './lib/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'llama-3.1-8b' | 'llama-3.3-70b'>('llama-3.1-8b');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);

  const docs = useDocuments();
  const chat = useChat();

  const handleModelChange = () => {
    setSelectedModel((m) => (m === 'llama-3.1-8b' ? 'llama-3.3-70b' : 'llama-3.1-8b'));
  };

  const handleSendMessage = (message: string) => {
    if (!docs.selectedDocument) return;
    chat.sendMessage(message, docs.selectedDocument.record.doc, selectedModel);
  };

  const handleSelectDocument = (index: number) => {
    docs.selectDocument(index);
    chat.clearChat();
    setSelectedSectionIndex(0);
  };

  const handleNewChat = () => {
    chat.clearChat();
    setActiveConversation(-1);
  };

  const handleUploadDocument = (doc: FinancialDocument) => {
    docs.addDocument(doc);
    chat.clearChat();
    setUploadOpen(false);
  };

  const selectedDocument = docs.selectedDocument;

  // Build sections from the current document for the viewer's extracted data panel
  const sections = useMemo(() => {
    if (!selectedDocument) return [];
    const doc = selectedDocument.record.doc;
    return [{
      table_title: selectedDocument.label,
      page_numbers: [] as number[],
      table: doc.table,
      pre_text: doc.pre_text,
      post_text: doc.post_text,
    }];
  }, [selectedDocument]);

  // Construct PDF URL from document ID (works with API-served documents)
  const pdfUrl = selectedDocument?.id && !selectedDocument.id.startsWith('custom-')
    ? `${API_BASE}/api/documents/${selectedDocument.id}/pdf`
    : null;

  // Build conversations list from chat messages
  const conversations: ConversationItem[] = chat.messages.length > 0
    ? [{
        id: 'current',
        name: chat.messages.find(m => m.role === 'user')?.content.slice(0, 40) ?? 'New Chat',
        preview: chat.messages[chat.messages.length - 1].content.slice(0, 60),
        date: 'Today',
      }]
    : [];

  return (
    <>
      <Header
        documentTitle={selectedDocument?.label ?? 'FinDoc AI'}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        onUpload={() => setUploadOpen(true)}
      />
      <main className="app-main">
        <aside className={`app-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          <HistorySidebar
            collapsed={sidebarCollapsed}
            conversations={conversations}
            activeIndex={activeConversation}
            onSelect={setActiveConversation}
            onNewChat={handleNewChat}
          />
        </aside>
        <section className="app-content">
          {docs.isLoading ? (
            <div className="doc-viewer">
              <div className="doc-viewer-toolbar">
                <div className="doc-viewer-toolbar-left">
                  <div className="skeleton skeleton-btn" />
                  <div className="skeleton skeleton-selector" />
                </div>
                <div className="doc-viewer-toolbar-right">
                  <div className="skeleton skeleton-zoom" />
                </div>
              </div>
              <div className="doc-viewer-scroll">
                <div className="doc-page">
                  <div className="doc-page-header">
                    <div className="skeleton skeleton-icon" />
                    <div className="doc-page-header-text">
                      <div className="skeleton skeleton-title" />
                      <div className="skeleton skeleton-subtitle" />
                    </div>
                  </div>
                  <div className="doc-page-section">
                    <div className="skeleton skeleton-section-title" />
                    <div className="skeleton skeleton-text-line" />
                    <div className="skeleton skeleton-text-line short" />
                  </div>
                  <div className="doc-page-section">
                    <div className="skeleton skeleton-section-title" />
                    <div className="skeleton skeleton-table" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <DocumentViewer
              documentId={selectedDocument?.id ?? null}
              pdfUrl={pdfUrl}
              sections={sections}
              selectedSectionIndex={selectedSectionIndex}
              onSelectSection={setSelectedSectionIndex}
              documents={docs.documents}
              selectedIndex={docs.selectedIndex}
              onSelectDocument={handleSelectDocument}
              onToggleSidebar={() => setSidebarCollapsed(c => !c)}
              onToggleChat={() => setChatVisible(v => !v)}
              onUpload={() => setUploadOpen(true)}
            />
          )}
        </section>
        <aside className={`app-chat${!chatVisible ? ' collapsed' : ''}${chatExpanded ? ' expanded' : ''}`}>
          <ChatPanel
            messages={chat.messages}
            isLoading={chat.isLoading}
            suggestions={docs.suggestions}
            onSendMessage={handleSendMessage}
            onClose={() => setChatVisible(false)}
            onExpand={() => setChatExpanded(e => !e)}
            onNewChat={handleNewChat}
            onRetry={chat.retryLastMessage}
            expanded={chatExpanded}
          />
        </aside>
      </main>
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUploadDocument}
      />
    </>
  );
}

export default App;
