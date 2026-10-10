export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatSourceCitation {
  title: string;
  url: string;
  chunk_id?: string;
  similarity?: number;
}

export interface ChatMessage {
  id?: string;
  conversation_id?: string;
  role: MessageRole;
  content: string;
  sources?: ChatSourceCitation[];
  created_at?: string;
}

export interface ConversationRecord {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  session_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  similarity: number;
  url: string;
  title: string;
  heading?: string;
  token_count?: number;
  metadata?: Record<string, any>;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  totalRetrieved: number;
  query: string;
}

export interface RAGContext {
  contextText: string;
  sources: ChatSourceCitation[];
  totalTokens: number;
}

export interface ChatRequest {
  chatbot_id: string;
  message: string;
  conversation_id?: string;
  session_id?: string;
}

export interface ChatResponse {
  message: string;
  sources: ChatSourceCitation[];
  conversation_id: string;
  message_id: string;
  latency_ms?: number;
  model?: string;
}

export interface ChatTelemetry {
  workspace_id: string;
  chatbot_id: string;
  conversation_id: string;
  user_query_length: number;
  retrieved_chunks_count: number;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  llm_provider: string;
  llm_model: string;
  status: 'success' | 'error';
  error_message?: string;
}
