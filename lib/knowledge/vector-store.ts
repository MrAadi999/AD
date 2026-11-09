import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { EMBEDDING_MODEL_NAME } from '../embeddings/embedding-service';

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
    embedding_model?: string;
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

/**
 * Save chunks to Supabase knowledge_chunks table using pgvector.
 * Stores the embedding model name with each chunk.
 * If the database fails, throws a clear Error.
 */
export async function saveKnowledgeChunks(
  workspaceId: string,
  chatbotId: string,
  chunks: KnowledgeChunkRecord[]
): Promise<void> {
  if (!chunks.length) return;

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured. Cannot save knowledge chunks.');
  }

  const supabase = createServerClient();

  // Group chunks by knowledge_source_id to replace atomically per source
  const sourceIds = Array.from(
    new Set(chunks.map((c) => c.knowledge_source_id).filter(Boolean) as string[])
  );

  // Delete prior chunks for these sources
  for (const sId of sourceIds) {
    const { error: delError } = await supabase
      .from('knowledge_chunks')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('chatbot_id', chatbotId)
      .eq('knowledge_source_id', sId);

    if (delError) {
      throw new Error(`Database error deleting old chunks for source "${sId}": ${delError.message}`);
    }
  }

  // Format records for insertion with stored embedding_model
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
    metadata: {
      ...(c.metadata || {}),
      embedding_model: EMBEDDING_MODEL_NAME,
    },
    created_at: c.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('knowledge_chunks').insert(batch);
    if (insertError) {
      throw new Error(`Database error saving knowledge chunks to Supabase: ${insertError.message}`);
    }
  }
}

/**
 * Retrieve all chunks for a chatbot strictly from Supabase Postgres.
 */
export async function getChunksForChatbot(
  workspaceId: string,
  chatbotId: string,
  options?: { limit?: number; offset?: number }
): Promise<KnowledgeChunkRecord[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId)
    .order('chunk_index', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Database error fetching knowledge chunks for chatbot "${chatbotId}": ${error.message}`);
  }

  return (data as KnowledgeChunkRecord[]) || [];
}

/**
 * Get aggregate chunk and token statistics for a chatbot strictly from Supabase Postgres.
 */
export async function getChunkStatsForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<{ totalChunks: number; totalTokens: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, count, error } = await supabase
    .from('knowledge_chunks')
    .select('token_count', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId);

  if (error) {
    throw new Error(`Database error fetching chunk stats: ${error.message}`);
  }

  const totalTokens = (data || []).reduce((acc, row) => acc + (row.token_count || 0), 0);
  return {
    totalChunks: count || (data || []).length,
    totalTokens,
  };
}

/**
 * Get chunk count mapped per knowledge source ID strictly from Supabase Postgres.
 */
export async function getChunkCountsBySourceForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const counts: Record<string, number> = {};
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .select('knowledge_source_id')
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId);

  if (error) {
    throw new Error(`Database error fetching source chunk counts: ${error.message}`);
  }

  for (const row of data || []) {
    if (row.knowledge_source_id) {
      counts[row.knowledge_source_id] = (counts[row.knowledge_source_id] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Delete chunks belonging to a specific knowledge source from Supabase.
 */
export async function deleteChunksForSource(
  workspaceId: string,
  chatbotId: string,
  sourceId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId)
    .eq('knowledge_source_id', sourceId);

  if (error) {
    throw new Error(`Database error deleting chunks for source "${sourceId}": ${error.message}`);
  }
}

/**
 * Delete all chunks belonging to a chatbot from Supabase.
 */
export async function deleteChunksForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId);

  if (error) {
    throw new Error(`Database error deleting chunks for chatbot "${chatbotId}": ${error.message}`);
  }
}

/**
 * Semantic vector similarity search using Supabase pgvector RPC.
 * Enforces strict chatbot_id and workspace tenant isolation.
 * Throws a clear Error if the database RPC fails.
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

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured. pgvector search unavailable.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_chatbot_id: chatbotId,
    match_count: topK,
    similarity_threshold: similarityThreshold,
  });

  if (error) {
    throw new Error(`Database error: pgvector RPC match_knowledge_chunks failed: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((r: any) => ({
    id: r.id,
    knowledge_source_id: r.knowledge_source_id,
    content: r.content,
    chunk_index: r.chunk_index,
    token_count: r.token_count,
    metadata: {
      ...(r.metadata || {}),
      embedding_model: r.metadata?.embedding_model || EMBEDDING_MODEL_NAME,
    },
    similarity: Number(r.similarity.toFixed(4)),
  }));
}
