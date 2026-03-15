export interface FinancialDocument {
  pre_text: string;
  post_text: string;
  table: Record<string, Record<string, string | number>>;
}

export interface Dialogue {
  conv_questions: string[];
  conv_answers: string[];
  turn_program: string[];
  executed_answers: number[];
  qa_split: boolean[];
}

export interface DocumentFeatures {
  num_dialogue_turns: number;
  has_type2_question: boolean;
  has_duplicate_columns: boolean;
  has_non_numeric_values: boolean;
}

export interface ConvFinQARecord {
  id: string;
  doc: FinancialDocument;
  dialogue: Dialogue;
  features: DocumentFeatures;
}

export interface ExampleRecords {
  examples: ConvFinQARecord[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export interface ConversationHistoryEntry {
  question: string;
  answer: string;
}

export interface ChatRequest {
  document: FinancialDocument;
  conversation_history: ConversationHistoryEntry[];
  question: string;
  model: string;
  calculation_memory: number[];
}

export interface ChatResponse {
  answer: string;
  model: string;
  calculation_memory: number[];
}

export interface SampleDocument {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  record: ConvFinQARecord;
}

export interface ConversationItem {
  id: string;
  name: string;
  preview: string;
  date: string;
}
