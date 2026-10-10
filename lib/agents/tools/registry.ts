import { AgentToolHandler } from './base';
import { CalculatorTool } from './calculator';
import { KnowledgeSearchTool } from './knowledge-search';
import { HttpGetTool } from './http-get';
import { ConfiguredApiTool } from './configured-api';

const toolHandlers = new Map<string, AgentToolHandler>([
  [CalculatorTool.type, CalculatorTool],
  [KnowledgeSearchTool.type, KnowledgeSearchTool],
  [HttpGetTool.type, HttpGetTool],
  [ConfiguredApiTool.type, ConfiguredApiTool],
  // Also register by tool name
  [CalculatorTool.name, CalculatorTool],
  [KnowledgeSearchTool.name, KnowledgeSearchTool],
  [HttpGetTool.name, HttpGetTool],
  [ConfiguredApiTool.name, ConfiguredApiTool],
]);

export function getToolHandler(typeOrName: string): AgentToolHandler | undefined {
  return toolHandlers.get(typeOrName);
}

export function getAllToolDefinitions(): AgentToolHandler[] {
  return [CalculatorTool, KnowledgeSearchTool, HttpGetTool, ConfiguredApiTool];
}

/**
 * Validate tool input arguments against the tool's declared JSON schema
 */
export function validateToolInput(
  handler: AgentToolHandler,
  input: Record<string, any>
): { valid: boolean; error?: string } {
  const schema = handler.input_schema;
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Tool arguments must be an object.' };
  }

  for (const reqField of schema.required) {
    if (input[reqField] === undefined || input[reqField] === null || input[reqField] === '') {
      return { valid: false, error: `Missing required parameter "${reqField}".` };
    }
  }

  return { valid: true };
}
