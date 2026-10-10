export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived';

export type ToolType =
  | 'knowledge_search'
  | 'calculator'
  | 'http_request'
  | 'configured_api'
  | 'custom';

export interface AgentRecord {
  id: string;
  workspace_id: string;
  chatbot_id?: string | null;
  chatbot_name?: string;
  name: string;
  description?: string | null;
  purpose: string;
  system_instructions: string;
  model: string;
  temperature: number;
  max_steps: number;
  status: AgentStatus;
  tools?: AgentToolRecord[];
  runs_count?: number;
  last_active_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AgentToolRecord {
  id: string;
  workspace_id: string;
  agent_id: string;
  tool_type: ToolType;
  name: string;
  description: string;
  configuration: Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AgentStepTrace {
  step_number: number;
  tool_name?: string;
  tool_type?: ToolType;
  tool_input?: Record<string, any>;
  tool_output?: any;
  latency_ms: number;
  status: 'success' | 'error';
  timestamp: string;
}

export interface AgentRunRecord {
  id: string;
  workspace_id: string;
  agent_id: string;
  conversation_id?: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: string;
  output?: string | null;
  steps: AgentStepTrace[];
  tool_calls_count: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number;
  error_code?: string | null;
  created_at: string;
  completed_at?: string | null;
  agent_name?: string;
}

export interface AgentRunRequest {
  input: string;
  session_id?: string;
  conversation_id?: string;
}

export interface AgentRunResponse {
  id: string;
  agent_id: string;
  output: string;
  status: 'completed' | 'failed';
  steps: AgentStepTrace[];
  tool_calls: Array<{
    tool: string;
    input?: any;
    output?: any;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  created_at: string;
}

export interface CreateAgentDTO {
  name: string;
  description?: string;
  purpose: string;
  system_instructions: string;
  chatbot_id?: string | null;
  model?: string;
  temperature?: number;
  max_steps?: number;
  status?: AgentStatus;
  tools?: Array<{
    tool_type: ToolType;
    name: string;
    description: string;
    configuration?: Record<string, any>;
    enabled: boolean;
  }>;
}

export interface AgentAnalyticsSummary {
  timeframe: 'today' | '7d' | '30d';
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  total_tool_calls: number;
  total_tokens: number;
  avg_latency_ms: number;
  time_series: Array<{
    timestamp: string;
    runs: number;
    tool_calls: number;
    tokens: number;
  }>;
}
