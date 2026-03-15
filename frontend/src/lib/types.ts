export interface ExtractedSection {
  pre_text: string;
  post_text: string;
  table: Record<string, Record<string, string | number>>;
  table_title: string;
  page_numbers: number[];
}

export interface DocumentInfo {
  id: string;
  filename: string;
  label: string;
  shortLabel: string;
  description: string;
  company: string;
  section_count: number;
  page_count: number;
}

export interface ExtractedDocument {
  id: string;
  filename: string;
  sections: ExtractedSection[];
  full_text: string;
  page_count: number;
  extraction_status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  reasoning?: string;
  extractedValues?: string[];
  program?: string[];
  formatType?: string;
}

export interface ConversationHistoryEntry {
  question: string;
  answer: string;
}

export interface ChatRequest {
  document_id: string;
  section_index: number;
  conversation_history: ConversationHistoryEntry[];
  question: string;
  model: string;
  calculation_memory: number[];
}

export interface ChatResponse {
  answer: string;
  reasoning: string;
  extracted_values: string[];
  program: string[];
  format_type: string;
  model: string;
  calculation_memory: number[];
}

export interface SampleDocument {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  sectionCount: number;
  pageCount: number;
}

export interface ConversationItem {
  id: string;
  name: string;
  preview: string;
  date: string;
}
