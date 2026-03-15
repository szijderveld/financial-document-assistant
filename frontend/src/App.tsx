import { useState } from 'react';
import Header from './components/Header';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'llama-3.1-8b' | 'llama-3.3-70b'>('llama-3.1-8b');
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleModelChange = () => {
    setSelectedModel((m) => (m === 'llama-3.1-8b' ? 'llama-3.3-70b' : 'llama-3.1-8b'));
  };

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
          <div style={{ padding: 'var(--space-lg)', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            History sidebar placeholder
          </div>
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
