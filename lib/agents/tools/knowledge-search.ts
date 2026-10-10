import { AgentToolHandler, ToolExecutionContext, ToolExecutionResult } from './base';
import { retrieveRelevantKnowledge } from '../../chat/retrieval';

export const KnowledgeSearchTool: AgentToolHandler = {
  type: 'knowledge_search',
  name: 'knowledge_search',
  description:
    'Search company knowledge base, documentation, refund policies, FAQs, and product catalogs.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Semantic query to search across company knowledge chunks',
      },
    },
    required: ['query'],
  },
  async execute(
    input: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const query = String(input.query || '').trim();

    if (!query) {
      return {
        success: false,
        error: 'Missing required "query" parameter.',
        latency_ms: Date.now() - startTime,
      };
    }

    if (!context.chatbotId) {
      return {
        success: true,
        data: {
          query: query,
          count: 0,
          results: [],
          message: 'No chatbot knowledge base is connected to this agent.',
          is_untrusted_data: true,
        },
        latency_ms: Date.now() - startTime,
      };
    }

    try {
      const result = await retrieveRelevantKnowledge({
        workspaceId: context.workspaceId,
        chatbotId: context.chatbotId,
        query: query,
        options: {
          topK: 4,
          similarityThreshold: 0.35,
        },
      });

      const formattedResults = result.chunks.map((c) => ({
        title: c.title,
        url: c.url,
        heading: c.heading,
        content: c.content.trim(),
        similarity: Number(c.similarity.toFixed(3)),
      }));

      return {
        success: true,
        data: {
          query: query,
          count: formattedResults.length,
          results: formattedResults,
          is_untrusted_data: true,
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Knowledge search failed.',
        latency_ms: Date.now() - startTime,
      };
    }
  },
};
