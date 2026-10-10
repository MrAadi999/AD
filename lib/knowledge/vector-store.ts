import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeChunkRecord {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  knowledge_source_id?: string;
  content: string;
  chunk_index: number;
  token_count: number;
  content_hash: string;
  embedding?: number[];
  metadata: {
    url?: string;
    title?: string;
    heading?: string;
    source_type?: string;
    chunk_index?: number;
    total_chunks?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at?: string;
}

export interface VectorSearchResult {
  id: string;
  knowledge_source_id?: string;
  content: string;
  chunk_index: number;
  token_count: number;
  metadata: Record<string, any>;
  similarity: number;
}

const CACHE_DIR = path.join(process.cwd(), '.next', 'knowledge_cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch {}
  }
}

function getChunksCacheFile(chatbotId: string): string {
  ensureCacheDir();
  return path.join(CACHE_DIR, `chunks_${chatbotId}.json`);
}

export function loadChunksFromDisk(chatbotId: string): KnowledgeChunkRecord[] {
  try {
    const f = getChunksCacheFile(chatbotId);
    if (fs.existsSync(f)) {
      const raw = fs.readFileSync(f, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function saveChunksToDisk(chatbotId: string, chunks: KnowledgeChunkRecord[]): void {
  try {
    const f = getChunksCacheFile(chatbotId);
    fs.writeFileSync(f, JSON.stringify(chunks, null, 2));
  } catch {}
}

// In-memory store for chunks (used for testing, local fallback, or rapid UI rendering)
export const inMemoryKnowledgeChunks = new Map<string, KnowledgeChunkRecord[]>();

/**
 * Calculate cosine similarity between two unit vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Save chunks to Supabase knowledge_chunks table (and in-memory fallback).
 * If knowledge_source_id is present, atomically replaces prior chunks for that source.
 */
export async function saveKnowledgeChunks(
  workspaceId: string,
  chatbotId: string,
  chunks: KnowledgeChunkRecord[]
): Promise<void> {
  if (!chunks.length) return;

  // Group chunks by knowledge_source_id to replace atomically per source
  const sourceIds = Array.from(
    new Set(chunks.map((c) => c.knowledge_source_id).filter(Boolean) as string[])
  );

  // Update in-memory store
  const existing = inMemoryKnowledgeChunks.get(chatbotId) || [];
  let updatedInMemory = existing;

  for (const sId of sourceIds) {
    updatedInMemory = updatedInMemory.filter((c) => c.knowledge_source_id !== sId);
  }
  updatedInMemory.push(...chunks);
  inMemoryKnowledgeChunks.set(chatbotId, updatedInMemory);
  saveChunksToDisk(chatbotId, updatedInMemory);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();

      // Delete prior chunks for these sources
      for (const sId of sourceIds) {
        await supabase
          .from('knowledge_chunks')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('chatbot_id', chatbotId)
          .eq('knowledge_source_id', sId);
      }

      // Format records for insertion
      const records = chunks.map((c) => ({
        id: c.id,
        workspace_id: workspaceId,
        chatbot_id: chatbotId,
        knowledge_source_id: c.knowledge_source_id || null,
        content: c.content,
        chunk_index: c.chunk_index,
        token_count: c.token_count,
        content_hash: c.content_hash,
        embedding: c.embedding || null,
        metadata: c.metadata || {},
        created_at: c.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Insert in batches of 50 to avoid request size limits
      const BATCH_SIZE = 50;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('knowledge_chunks').insert(batch);
        if (error) {
          console.warn('[VectorStore] Supabase chunk insert warning:', error.message);
        }
      }
    } catch (err: any) {
      console.warn('[VectorStore] Failed to persist chunks to Supabase, in-memory updated:', err.message);
    }
  }
}

/**
 * Retrieve all chunks for a chatbot
 */
export async function getChunksForChatbot(
  workspaceId: string,
  chatbotId: string,
  options?: { limit?: number; offset?: number }
): Promise<KnowledgeChunkRecord[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId)
        .order('chunk_index', { ascending: true })
        .range(offset, offset + limit - 1);

      if (!error && data && data.length > 0) {
        return data as KnowledgeChunkRecord[];
      }
    } catch {
      // fallback
    }
  }

  let inMem = inMemoryKnowledgeChunks.get(chatbotId);
  if (!inMem || inMem.length === 0) {
    inMem = loadChunksFromDisk(chatbotId);
    inMemoryKnowledgeChunks.set(chatbotId, inMem);
  }
  return (inMem || [])
    .filter((c) => c.workspace_id === workspaceId)
    .slice(offset, offset + limit);
}

/**
 * Get aggregate chunk and token statistics for a chatbot
 */
export async function getChunkStatsForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<{ totalChunks: number; totalTokens: number }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, count, error } = await supabase
        .from('knowledge_chunks')
        .select('token_count', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId);

      if (!error) {
        const totalTokens = (data || []).reduce((acc, row) => acc + (row.token_count || 0), 0);
        return {
          totalChunks: count || (data || []).length,
          totalTokens,
        };
      }
    } catch {
      // fallback
    }
  }

  let inMem = inMemoryKnowledgeChunks.get(chatbotId);
  if (!inMem || inMem.length === 0) {
    inMem = loadChunksFromDisk(chatbotId);
    inMemoryKnowledgeChunks.set(chatbotId, inMem);
  }
  const chatbotChunks = (inMem || []).filter((c) => c.workspace_id === workspaceId);
  return {
    totalChunks: chatbotChunks.length,
    totalTokens: chatbotChunks.reduce((acc, c) => acc + (c.token_count || 0), 0),
  };
}

/**
 * Get chunk count mapped per knowledge source ID
 */
export async function getChunkCountsBySourceForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .select('knowledge_source_id')
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId);

      if (!error && data && data.length > 0) {
        for (const row of data) {
          if (row.knowledge_source_id) {
            counts[row.knowledge_source_id] = (counts[row.knowledge_source_id] || 0) + 1;
          }
        }
        return counts;
      }
    } catch {}
  }

  let inMem = inMemoryKnowledgeChunks.get(chatbotId);
  if (!inMem || inMem.length === 0) {
    inMem = loadChunksFromDisk(chatbotId);
    inMemoryKnowledgeChunks.set(chatbotId, inMem);
  }
  for (const c of (inMem || [])) {
    if (c.workspace_id === workspaceId && c.knowledge_source_id) {
      counts[c.knowledge_source_id] = (counts[c.knowledge_source_id] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Delete chunks belonging to a specific knowledge source
 */
export async function deleteChunksForSource(
  workspaceId: string,
  chatbotId: string,
  sourceId: string
): Promise<void> {
  const existing = inMemoryKnowledgeChunks.get(chatbotId) || [];
  inMemoryKnowledgeChunks.set(
    chatbotId,
    existing.filter((c) => c.knowledge_source_id !== sourceId)
  );

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId)
        .eq('knowledge_source_id', sourceId);
    } catch (err: any) {
      console.warn('[VectorStore] Error deleting source chunks:', err.message);
    }
  }
}

/**
 * Delete all chunks belonging to a chatbot
 */
export async function deleteChunksForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<void> {
  inMemoryKnowledgeChunks.delete(chatbotId);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId);
    } catch (err: any) {
      console.warn('[VectorStore] Error deleting chatbot chunks:', err.message);
    }
  }
}

/**
 * Semantic vector similarity search
 * Enforces strict chatbot_id and workspace tenant isolation.
 */
export async function searchSimilarChunks(params: {
  workspaceId: string;
  chatbotId: string;
  queryEmbedding: number[];
  topK?: number;
  similarityThreshold?: number;
}): Promise<VectorSearchResult[]> {
  const {
    workspaceId,
    chatbotId,
    queryEmbedding,
    topK = 5,
    similarityThreshold = 0.35,
  } = params;

  // 1. Try Supabase pgvector RPC
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_chatbot_id: chatbotId,
        match_count: topK,
        similarity_threshold: similarityThreshold,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          knowledge_source_id: r.knowledge_source_id,
          content: r.content,
          chunk_index: r.chunk_index,
          token_count: r.token_count,
          metadata: r.metadata || {},
          similarity: Number(r.similarity.toFixed(4)),
        }));
      }
    } catch (err: any) {
      console.warn('[VectorStore] RPC similarity match error, using local fallback:', err.message);
    }
  }

  // 2. Fallback: local cosine similarity over in-memory / disk cached chunks
  let chunks = inMemoryKnowledgeChunks.get(chatbotId);
  if (!chunks || chunks.length === 0) {
    chunks = loadChunksFromDisk(chatbotId);
    if (chunks && chunks.length > 0) {
      inMemoryKnowledgeChunks.set(chatbotId, chunks);
    }
  }
  chunks = chunks || [];
  const matches: VectorSearchResult[] = [];

  for (const chunk of chunks) {
    // Strictly isolate workspace and chatbot
    if (chunk.workspace_id !== workspaceId || chunk.chatbot_id !== chatbotId) {
      continue;
    }
    if (!chunk.embedding || chunk.embedding.length === 0) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    if (similarity >= similarityThreshold) {
      matches.push({
        id: chunk.id,
        knowledge_source_id: chunk.knowledge_source_id,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
        token_count: chunk.token_count,
        metadata: chunk.metadata || {},
        similarity: Number(similarity.toFixed(4)),
      });
    }
  }

  // Sort descending by similarity score and take topK
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches.slice(0, topK);
}
