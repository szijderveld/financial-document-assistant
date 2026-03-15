import { useState } from 'react';
import type { ConversationItem } from '../lib/types';

interface HistorySidebarProps {
  collapsed: boolean;
  conversations: ConversationItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onNewChat: () => void;
}

function HistorySidebar({ collapsed, conversations, activeIndex, onSelect, onNewChat }: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group conversations by date label
  const grouped = groupByDate(filtered);

  return (
    <div className={`sidebar-inner${collapsed ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">CONVERSATIONS</span>
        <button className="sidebar-new-btn" onClick={onNewChat} title="New conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <svg className="sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="sidebar-search-input"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Conversation list */}
      <div className="sidebar-list">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">
            {conversations.length === 0 ? 'No conversations yet' : 'No matches found'}
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="sidebar-group">
              <div className="sidebar-group-label">{dateLabel}</div>
              {items.map((item) => {
                const index = conversations.findIndex((c) => c.id === item.id);
                const isActive = index === activeIndex;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item${isActive ? ' active' : ''}`}
                    onClick={() => onSelect(index)}
                  >
                    <svg className="sidebar-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <div className="sidebar-item-text">
                      <span className="sidebar-item-name truncate">{item.name}</span>
                      <span className="sidebar-item-preview truncate">{item.preview}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Privacy badge */}
      <div className="sidebar-footer">
        <div className="sidebar-privacy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Documents stay private — never stored server-side</span>
        </div>
      </div>
    </div>
  );
}

function groupByDate(items: ConversationItem[]): Record<string, ConversationItem[]> {
  const groups: Record<string, ConversationItem[]> = {};
  for (const item of items) {
    const label = item.date || 'Today';
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return groups;
}

export default HistorySidebar;
