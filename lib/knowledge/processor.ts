import * as crypto from 'crypto';
import { cleanRawText } from './cleaner';
import { chunkDocument, TextChunk } from './chunker';
import { generateEmbeddingsBatch } from '../embeddings/embedding-service';
import {
  saveKnowledgeChunks,
  KnowledgeChunkRecord,
  getChunkStatsForChatbot,
} from './vector-store';
import { KnowledgeSource } from '../crawler/types';
import { getKnowledgeSourcesForChatbot } from '../crawler/runner';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';

export interface ProcessingResult {
  sourceId: string;
  url: string;
  chunksCount: number;
  tokensCount: number;
  status: 'completed' | 'skipped' | 'failed';
  error?: string;
}

export interface BatchProcessingSummary {
  workspaceId: string;
  chatbotId: string;
  totalSources: number;
  processedSources: number;
  totalChunks: number;
  totalTokens: number;
  results: ProcessingResult[];
}

/**
 * Process a single knowledge source:
 * clean -> chunk -> embed -> atomic persist
 */
export async function processKnowledgeSource(
  workspaceId: string,
  chatbotId: string,
  source: KnowledgeSource
): Promise<ProcessingResult> {
  try {
    if (!source.content || !source.content.trim()) {
      return {
        sourceId: source.id,
        url: source.url,
        chunksCount: 0,
        tokensCount: 0,
        status: 'skipped',
        error: 'Content is empty',
      };
    }

    // 1. Clean and normalize content
    const cleaned = cleanRawText(source.content);
    if (!cleaned || cleaned.trim().length < 20) {
      return {
        sourceId: source.id,
        url: source.url,
        chunksCount: 0,
        tokensCount: 0,
        status: 'skipped',
        error: 'Cleaned content too brief for knowledge processing',
      };
    }

    // 2. Intelligent chunking
    const chunks: TextChunk[] = chunkDocument(cleaned, {
      url: source.url,
      title: source.title || 'Website Page',
      source_type: 'website',
    });

    if (chunks.length === 0) {
      return {
        sourceId: source.id,
        url: source.url,
        chunksCount: 0,
        tokensCount: 0,
        status: 'skipped',
        error: 'No meaningful chunks could be formed',
      };
    }

    // 3. Batch generate vector embeddings
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts);

    // 4. Build chunk records
    const now = new Date().toISOString();
    const chunkRecords: KnowledgeChunkRecord[] = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      chatbot_id: chatbotId,
      knowledge_source_id: source.id,
      content: chunk.content,
      chunk_index: chunk.metadata.chunk_index,
      token_count: chunk.token_count,
      content_hash: chunk.content_hash,
      embedding: embeddings[index] || [],
      metadata: {
        ...chunk.metadata,
        knowledge_source_id: source.id,
      },
      created_at: now,
      updated_at: now,
    }));

    // 5. Atomic persist to pgvector / in-memory
    await saveKnowledgeChunks(workspaceId, chatbotId, chunkRecords);

    const totalTokens = chunkRecords.reduce((acc, c) => acc + c.token_count, 0);

    return {
      sourceId: source.id,
      url: source.url,
      chunksCount: chunkRecords.length,
      tokensCount: totalTokens,
      status: 'completed',
    };
  } catch (err: any) {
    console.error(`[KnowledgeProcessor] Error processing source ${source.id}:`, err);
    return {
      sourceId: source.id,
      url: source.url,
      chunksCount: 0,
      tokensCount: 0,
      status: 'failed',
      error: err.message || 'Unknown processing error',
    };
  }
}

/**
 * Process all knowledge sources for a chatbot into vector embeddings
 */
export async function processAllKnowledgeSourcesForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<BatchProcessingSummary> {
  const sources = await getKnowledgeSourcesForChatbot(workspaceId, chatbotId);
  const results: ProcessingResult[] = [];

  for (const source of sources) {
    const res = await processKnowledgeSource(workspaceId, chatbotId, source);
    results.push(res);
  }

  const stats = await getChunkStatsForChatbot(workspaceId, chatbotId);

  return {
    workspaceId,
    chatbotId,
    totalSources: sources.length,
    processedSources: results.filter((r) => r.status === 'completed').length,
    totalChunks: stats.totalChunks,
    totalTokens: stats.totalTokens,
    results,
  };
}
