import type { ChatRequest, ChatResponse } from './types';

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

export interface ExtractedSection {
  pre_text: string;
  post_text: string;
  table: Record<string, Record<string, string | number>>;
  table_title: string;
  page_numbers: number[];
}

export interface ExtractedDocument {
  id: string;
  filename: string;
  sections: ExtractedSection[];
  full_text: string;
  page_count: number;
  extraction_status: string;
}

export interface DocumentListItem {
  id: string;
  filename: string;
  label: string;
  shortLabel: string;
  description: string;
  company: string;
  section_count: number;
  page_count: number;
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

export async function fetchDocuments(): Promise<DocumentListItem[]> {
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
