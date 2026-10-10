export type ApiKeyEnvironment = 'live' | 'test';

export interface ApiKeyRecord {
  id: string;
  workspace_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  environment: ApiKeyEnvironment;
  last_used_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  environment?: ApiKeyEnvironment;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // Plaintext key returned ONCE at creation
  key_prefix: string;
  environment: ApiKeyEnvironment;
  created_at: string;
}

export interface ApiUsageRecord {
  id: string;
  workspace_id: string;
  api_key_id?: string | null;
  chatbot_id?: string | null;
  request_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  created_at: string;
}

export interface ApiRequestLogRecord {
  id: string;
  workspace_id: string;
  api_key_id?: string | null;
  chatbot_id?: string | null;
  chatbot_name?: string | null;
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  error_code?: string | null;
  created_at: string;
}

export interface DeveloperChatRequest {
  bot_id: string;
  message: string;
  session_id?: string;
  conversation_id?: string;
}

export interface DeveloperChatResponse {
  id: string;
  object: 'chat.response';
  bot_id: string;
  message: string;
  sources: Array<{
    title: string;
    url: string;
    heading?: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  created_at: string;
  request_id: string;
}

export interface UsageSummary {
  timeframe: 'today' | '7d' | '30d';
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  tokens_used: number;
  avg_latency_ms: number;
  rate_limited_count: number;
  time_series: Array<{
    timestamp: string;
    requests: number;
    tokens: number;
    errors: number;
  }>;
}
