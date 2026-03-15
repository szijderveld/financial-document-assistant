import { useState } from 'react';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import DocumentViewer from './components/DocumentViewer';
import ChatPanel from './components/ChatPanel';
import { useDocuments } from './hooks/useDocuments';
import { useChat } from './hooks/useChat';
import type { ConversationItem } from './lib/types';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'llama-3.1-8b' | 'llama-3.3-70b'>('llama-3.1-8b');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(0);

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
  };

  const handleNewChat = () => {
    chat.clearChat();
    setActiveConversation(-1);
  };

  const selectedDocument = docs.selectedDocument;

  const documentMeta = selectedDocument
    ? {
        company: selectedDocument.label,
        shortLabel: selectedDocument.shortLabel,
        subtitle: selectedDocument.description,
      }
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
          <DocumentViewer
            document={selectedDocument?.record.doc ?? null}
            documentMeta={documentMeta}
            documents={docs.documents}
            selectedIndex={docs.selectedIndex}
            onSelectDocument={handleSelectDocument}
            onToggleSidebar={() => setSidebarCollapsed(c => !c)}
            onToggleChat={() => setChatVisible(v => !v)}
            onUpload={() => setUploadOpen(true)}
          />
        </section>
        <aside className={`app-chat${!chatVisible ? ' collapsed' : ''}`}>
          <ChatPanel
            messages={chat.messages}
            isLoading={chat.isLoading}
            suggestions={docs.suggestions}
            onSendMessage={handleSendMessage}
            onClose={() => setChatVisible(false)}
            onExpand={() => setChatExpanded(e => !e)}
            onNewChat={handleNewChat}
            expanded={chatExpanded}
          />
        </aside>
      </main>
    </>
  );
}

export default App;
