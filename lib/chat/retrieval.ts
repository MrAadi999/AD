import { generateEmbedding } from '../embeddings/embedding-service';
import { searchSimilarChunks } from '../knowledge/vector-store';
import { searchLearnedMemories, recordKnowledgeGap } from '../knowledge/auto-learning';
import { RetrievedChunk, RetrievalResult } from './types';

const DEFAULT_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);
const DEFAULT_SIMILARITY_THRESHOLD = parseFloat(
  process.env.RAG_SIMILARITY_THRESHOLD || '0.35'
);

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
  entities?: string[];
  intent?: string;
}

/**
 * Calculates lexical keyword overlap and entity matching score (0 to 1)
 */
function calculateLexicalRelevance(chunkText: string, query: string, entities: string[] = []): number {
  const lowerChunk = chunkText.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 1. Entity Match (High weight)
  let entityScore = 0;
  if (entities.length > 0) {
    const matchedCount = entities.filter((e) => lowerChunk.includes(e.toLowerCase())).length;
    entityScore = matchedCount / entities.length;
  }

  // 2. Keyword Overlap (Exclude common stopwords)
  const stopwords = new Set([
    'what', 'is', 'the', 'of', 'and', 'a', 'in', 'to', 'for', 'about', 'tell', 'me', 'how',
    'kya', 'hai', 'bhai', 'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'aur', 'ye'
  ]);
  const queryTokens = lowerQuery
    .replace(/[^\w\s₹$]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopwords.has(t));

  let tokenMatchCount = 0;
  for (const token of queryTokens) {
    if (lowerChunk.includes(token)) {
      tokenMatchCount++;
    }
  }

  const keywordScore = queryTokens.length > 0 ? tokenMatchCount / queryTokens.length : 0;
  return (entityScore * 0.6) + (keywordScore * 0.4);
}

/**
 * Hybrid RAG Retrieval Engine:
 * Combines Dense Semantic Vector Search + Exact Lexical/Entity Matching + Source Authority Re-ranking
 */
export async function retrieveRelevantKnowledge(params: {
  workspaceId: string;
  chatbotId: string;
  query: string;
  options?: RetrievalOptions;
}): Promise<RetrievalResult> {
  const { workspaceId, chatbotId, query, options } = params;
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return { chunks: [], totalRetrieved: 0, query: '' };
  }

  const topK = options?.topK ?? DEFAULT_TOP_K;
  const similarityThreshold =
    options?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const entities = options?.entities || [];
  const intent = options?.intent || '';

  try {
    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(cleanQuery);

    // 2. Retrieve candidates from both vector stores (Static Crawled + Dynamic Learned)
    const [staticMatches, dynamicMemories] = await Promise.all([
      searchSimilarChunks({
        workspaceId,
        chatbotId,
        queryEmbedding,
        topK: topK * 3, // Retrieve wider candidate pool for re-ranking
        similarityThreshold: 0.1, // cast a wide net so lexical and hybrid re-ranking can surface the right chunk
      }),
      searchLearnedMemories({
        workspaceId,
        chatbotId,
        queryEmbedding,
        topK: 4,
        similarityThreshold: 0.1,
      }),
    ]);

    // 3. Map candidates
    const candidateChunks: RetrievedChunk[] = [];

    // Static website chunks
    for (const m of staticMatches) {
      const meta = m.metadata || {};
      candidateChunks.push({
        id: m.id,
        content: m.content,
        similarity: m.similarity,
        url: meta.url || '',
        title: meta.title || 'Official Documentation',
        heading: meta.heading || undefined,
        token_count: m.token_count || Math.ceil(m.content.length / 4),
        metadata: { ...meta, type: 'static_chunk', authorityLevel: 2 },
      });
    }

    // Dynamic verified memories (highest authority level)
    for (const mem of dynamicMemories) {
      candidateChunks.push({
        id: mem.id,
        content: `[VERIFIED REAL-TIME FACT / UPDATE]: ${mem.fact_content}`,
        similarity: mem.similarity,
        url: '',
        title: `Verified Fact (${mem.category})`,
        heading: 'Real-Time Update',
        token_count: Math.ceil(mem.fact_content.length / 4),
        metadata: {
          type: 'learned_memory',
          category: mem.category,
          source_type: mem.source_type,
          confidence_score: mem.confidence_score,
          authorityLevel: 1, // Highest priority
        },
      });
    }

    // 4. HYBRID RE-RANKING:
    // Combined Score = (Vector Similarity * 0.65) + (Lexical & Entity Match * 0.25) + (Authority Boost * 0.10)
    for (const chunk of candidateChunks) {
      const lexicalScore = calculateLexicalRelevance(chunk.content, cleanQuery, entities);
      let authorityBoost = 0;

      // Real-time verified memories get highest authority
      if (chunk.metadata?.authorityLevel === 1) {
        authorityBoost += 0.08;
      }

      // Intent-specific boosting (e.g. if intent is PRICING and chunk mentions prices or pricing)
      const lowerContent = chunk.content.toLowerCase();
      if (intent === 'PRICING' && /(price|pricing|₹|\$|cost|fee|rate)/i.test(lowerContent)) {
        authorityBoost += 0.05;
      }
      if (intent === 'RETURN_OR_REFUND' && /(return|refund|exchange|warranty)/i.test(lowerContent)) {
        authorityBoost += 0.05;
      }

      // Re-computed hybrid score
      chunk.similarity = Number(
        (chunk.similarity * 0.65 + lexicalScore * 0.25 + authorityBoost).toFixed(4)
      );
    }

    // 5. Sort by final hybrid score descending and pick topK
    candidateChunks.sort((a, b) => b.similarity - a.similarity);
    const finalChunks = candidateChunks
      .filter((c) => c.similarity >= 0.12)
      .slice(0, topK);

    // 6. Record knowledge gap if evidence is scarce or below threshold
    if (finalChunks.length === 0 || finalChunks[0].similarity < similarityThreshold) {
      recordKnowledgeGap({
        workspaceId,
        chatbotId,
        queryText: cleanQuery,
      }).catch((err) => console.warn('[Retrieval] Knowledge gap logging warning:', err.message));
    }

    return {
      chunks: finalChunks,
      totalRetrieved: finalChunks.length,
      query: cleanQuery,
    };
  } catch (err: any) {
    console.error('[RAG Retrieval] Error retrieving knowledge chunks:', err);
    return { chunks: [], totalRetrieved: 0, query: cleanQuery };
  }
}
