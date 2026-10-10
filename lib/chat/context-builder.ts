import { RetrievedChunk, RAGContext } from './types';
import { formatSourceCitations } from './source-formatter';

const DEFAULT_MAX_CONTEXT_TOKENS = parseInt(
  process.env.RAG_MAX_CONTEXT_TOKENS || '3000',
  10
);

/**
 * Build a structured, grounded context from retrieved chunks with clear source boundaries
 * Strictly manages token limits, prioritizing highest-similarity chunks.
 */
export function buildGroundedContext(
  chunks: RetrievedChunk[],
  maxTokens: number = DEFAULT_MAX_CONTEXT_TOKENS
): RAGContext {
  if (!chunks || chunks.length === 0) {
    return {
      contextText: '',
      sources: [],
      totalTokens: 0,
    };
  }

  // Sort descending by similarity to ensure the most relevant material is included
  const sortedChunks = [...chunks].sort((a, b) => b.similarity - a.similarity);

  const contextBlocks: string[] = [];
  const includedChunks: RetrievedChunk[] = [];
  let currentTokenCount = 0;

  for (let i = 0; i < sortedChunks.length; i++) {
    const chunk = sortedChunks[i];
    const chunkTokens =
      chunk.token_count || Math.ceil(chunk.content.length / 4);

    // If adding this chunk exceeds maxTokens and we already have at least 1 chunk, stop
    if (
      includedChunks.length > 0 &&
      currentTokenCount + chunkTokens > maxTokens
    ) {
      break;
    }

    const sourceNumber = includedChunks.length + 1;
    const title = chunk.title || 'Website Page';
    const url = chunk.url || 'N/A';
    const heading = chunk.heading ? `\nSection: ${chunk.heading}` : '';

    const block = `SOURCE ${sourceNumber}
Title: ${title}
URL: ${url}${heading}

Content:
${chunk.content.trim()}`;

    contextBlocks.push(block);
    includedChunks.push(chunk);
    currentTokenCount += chunkTokens;
  }

  const contextText = contextBlocks.join(
    '\n\n--------------------------------------------------\n\n'
  );
  const sources = formatSourceCitations(includedChunks);

  return {
    contextText,
    sources,
    totalTokens: currentTokenCount,
  };
}
