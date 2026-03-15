import type { ChatRequest, ChatResponse } from './types';

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.detail ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
