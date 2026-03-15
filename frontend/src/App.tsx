import { useState } from 'react';
import Header from './components/Header';
import HistorySidebar from './components/HistorySidebar';
import type { ConversationItem } from './lib/types';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'llama-3.1-8b' | 'llama-3.3-70b'>('llama-3.1-8b');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeConversation, setActiveConversation] = useState(0);

  const handleModelChange = () => {
    setSelectedModel((m) => (m === 'llama-3.1-8b' ? 'llama-3.3-70b' : 'llama-3.1-8b'));
  };

  // Placeholder conversations for now
  const conversations: ConversationItem[] = [
    { id: '1', name: 'Cash Flow Analysis', preview: 'What were the total cash flows?', date: 'Today' },
    { id: '2', name: 'Revenue Breakdown', preview: 'Show me revenue by segment', date: 'Today' },
    { id: '3', name: 'Pro Forma Review', preview: 'What is the pro forma adjustment?', date: 'Yesterday' },
  ];

  return (
    <>
      <Header
        documentTitle="JKHY Corp — Cash Flow Analysis"
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
            onNewChat={() => setActiveConversation(-1)}
          />
        </aside>
        <section className="app-content">
          <div style={{ padding: 'var(--space-xl)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Document viewer placeholder
          </div>
        </section>
        <aside className={`app-chat${!chatVisible ? ' collapsed' : ''}`}>
          <div style={{ padding: 'var(--space-lg)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            Chat panel placeholder
          </div>
        </aside>
      </main>
    </>
  );
}

export default App;
