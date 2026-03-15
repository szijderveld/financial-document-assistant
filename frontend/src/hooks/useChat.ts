import { useState, useCallback } from 'react';
import type { ChatMessage, ConversationHistoryEntry, FinancialDocument } from '../lib/types';
import { sendChatMessage } from '../lib/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (question: string, document: FinancialDocument, model: string) => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await sendChatMessage({
          document,
          conversation_history: conversationHistory,
          question,
          model,
        });

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setConversationHistory((prev) => [
          ...prev,
          { question, answer: response.answer },
        ]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${errorMsg}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationHistory],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat };
}
