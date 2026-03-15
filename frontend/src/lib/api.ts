import type { ChatRequest, ChatResponse, DocumentInfo, ExtractedDocument } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
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

export async function uploadDocument(file: File): Promise<ExtractedDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.detail ?? `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const response = await fetch(`${API_BASE}/api/documents`);

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.status}`);
  }

  return response.json();
}

export async function fetchDocument(id: string): Promise<ExtractedDocument> {
  const response = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status}`);
  }

  return response.json();
}

export function getDocumentPdfUrl(id: string): string {
  return `${API_BASE}/api/documents/${encodeURIComponent(id)}/pdf`;
}
