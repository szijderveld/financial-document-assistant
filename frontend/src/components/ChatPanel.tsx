import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../lib/types';
import { formatAnswer } from '../lib/formatters';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  suggestions: string[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
  onExpand: () => void;
  onNewChat: () => void;
  expanded: boolean;
}

function ChatPanel({
  messages,
  isLoading,
  suggestions,
  onSendMessage,
  onClose,
  onExpand,
  onNewChat,
  expanded,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    onSendMessage(suggestion);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-panel-header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="chat-panel-title">AI Assistant</span>
        </div>
        <div className="chat-panel-header-actions">
          <button
            className="chat-panel-header-btn"
            onClick={onExpand}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {expanded ? (
                <>
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              ) : (
                <>
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </>
              )}
            </svg>
          </button>
          <button
            className="chat-panel-header-btn"
            onClick={onNewChat}
            title="New chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            className="chat-panel-header-btn"
            onClick={onClose}
            title="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="chat-panel-body">
        {isEmpty ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="chat-empty-heading">Ask about this document</h3>
            <p className="chat-empty-description">
              Ask questions about the financial data, request calculations, or explore trends in the document.
            </p>
            {suggestions.length > 0 && (
              <div className="chat-suggestions">
                {suggestions.slice(0, 4).map((suggestion, i) => (
                  <button
                    key={i}
                    className="chat-suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message chat-message-${msg.role} animate-message-in`}
              >
                <div className="chat-message-avatar">
                  {msg.role === 'user' ? (
                    <span className="chat-avatar chat-avatar-user">SZ</span>
                  ) : (
                    <span className="chat-avatar chat-avatar-assistant">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-meta">
                    <span className="chat-message-name">
                      {msg.role === 'user' ? 'You' : 'FinDoc AI'}
                    </span>
                    <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className={`chat-bubble chat-bubble-${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      <>
                        <span className="chat-answer-highlight">
                          {formatAnswer(msg.content).formatted}
                        </span>
                        <span className="chat-answer-context">
                          {formatAnswer(msg.content).type === 'percentage'
                            ? 'Calculated from document data'
                            : formatAnswer(msg.content).type === 'number'
                              ? 'Extracted from table'
                              : 'Based on document analysis'}
                        </span>
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="chat-message chat-message-assistant animate-message-in">
                <div className="chat-message-avatar">
                  <span className="chat-avatar chat-avatar-assistant">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                </div>
                <div className="chat-message-content">
                  <div className="chat-message-meta">
                    <span className="chat-message-name">FinDoc AI</span>
                  </div>
                  <div className="chat-bubble chat-bubble-assistant">
                    <div className="chat-typing-indicator">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="chat-panel-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Ask about this document..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            title="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="chat-disclaimer">
          FinDoc AI uses Llama 3.1. Verify important calculations.
        </p>
      </div>
    </div>
  );
}

export default ChatPanel;
