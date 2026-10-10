import { ToolType } from '../types';

export interface ToolInputSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: string;
      description: string;
      enum?: string[];
    }
  >;
  required: string[];
}

export interface ToolExecutionContext {
  workspaceId: string;
  agentId: string;
  chatbotId?: string | null;
  config?: Record<string, any>;
  timeoutMs?: number;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  latency_ms: number;
}

export interface AgentToolHandler {
  type: ToolType;
  name: string;
  description: string;
  input_schema: ToolInputSchema;
  execute(
    input: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;
}
