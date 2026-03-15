import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ConversationHistoryEntry } from '../lib/types';
import { sendChatMessage } from '../lib/api';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryEntry[]>([]);
  const [calculationMemory, setCalculationMemory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFailedRef = useRef<{ question: string; documentId: string; sectionIndex: number; model: string } | null>(null);

  const sendMessage = useCallback(
    async (question: string, documentId: string, sectionIndex: number, model: string) => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      lastFailedRef.current = null;

      try {
        const response = await sendChatMessage({
          document_id: documentId,
          section_index: sectionIndex,
          conversation_history: conversationHistory,
          question,
          model,
          calculation_memory: calculationMemory,
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
        setCalculationMemory(response.calculation_memory);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setError(errorMsg);
        lastFailedRef.current = { question, documentId, sectionIndex, model };
      } finally {
        setIsLoading(false);
      }
    },
    [conversationHistory, calculationMemory],
  );

  const retryLastMessage = useCallback(() => {
    if (!lastFailedRef.current) return;
    const { question, documentId, sectionIndex, model } = lastFailedRef.current;
    // Remove the error message before retrying
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.isError) return prev.slice(0, -1);
      return prev;
    });
    lastFailedRef.current = null;
    setIsLoading(true);
    setError(null);

    sendChatMessage({
      document_id: documentId,
      section_index: sectionIndex,
      conversation_history: conversationHistory,
      question,
      model,
      calculation_memory: calculationMemory,
    })
      .then((response) => {
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
        setCalculationMemory(response.calculation_memory);
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setError(errorMsg);
        lastFailedRef.current = { question, documentId, sectionIndex, model };
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [conversationHistory, calculationMemory]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    setCalculationMemory([]);
    setError(null);
    lastFailedRef.current = null;
  }, []);

  return { messages, isLoading, error, sendMessage, clearChat, retryLastMessage };
}
