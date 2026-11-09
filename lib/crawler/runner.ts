import { createClient as createServerClient } from '../supabase/server';
import { createAdminClient } from '../supabase/admin';
import { isSupabaseConfigured } from '../supabase/client';
import { CrawlJob, KnowledgeSource } from './types';
import { runPlaywrightCrawl } from './playwright-crawler';

/**
 * Get latest crawl job for a chatbot directly from Supabase Postgres.
 */
export async function getLatestJobForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<CrawlJob | null> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('crawl_jobs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Database error fetching crawl job: ${error.message}`);
  }

  return (data as CrawlJob) || null;
}

/**
 * Get all knowledge sources for a chatbot strictly from Supabase Postgres.
 */
export async function getKnowledgeSourcesForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<KnowledgeSource[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId)
    .order('crawled_at', { ascending: false });

  if (error) {
    throw new Error(`Database error fetching knowledge sources: ${error.message}`);
  }

  return (data as KnowledgeSource[]) || [];
}

/**
 * Delete a knowledge source and associated data from Supabase.
 */
export async function deleteKnowledgeSource(
  workspaceId: string,
  chatbotId: string,
  sourceId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('knowledge_sources')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId)
    .eq('id', sourceId);

  if (error) {
    throw new Error(`Database error deleting knowledge source: ${error.message}`);
  }

  return true;
}

/**
 * Upsert a knowledge source record into Supabase Postgres.
 */
export async function addOrUpdateKnowledgeSource(
  workspaceId: string,
  chatbotId: string,
  source: KnowledgeSource
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('knowledge_sources').upsert(
    {
      id: source.id,
      workspace_id: workspaceId,
      chatbot_id: chatbotId,
      source_type: source.source_type,
      url: source.url,
      title: source.title,
      content: source.content,
      content_hash: source.content_hash,
      status: source.status,
      word_count: source.word_count,
      crawled_at: source.crawled_at,
      created_at: source.created_at,
      updated_at: source.updated_at,
    },
    { onConflict: 'chatbot_id,url' }
  );

  if (error) {
    throw new Error(`Database error saving knowledge source to Supabase: ${error.message}`);
  }
}

/**
 * Launch the single Playwright-based crawler as a background task.
 * Persists job progress strictly into Supabase crawl_jobs.
 */
export function startBackgroundCrawl(
  jobId: string,
  chatbotId: string,
  workspaceId: string,
  websiteUrl: string,
  maxPages?: number
): CrawlJob {
  const initialJob: CrawlJob = {
    id: jobId,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    start_url: websiteUrl,
    status: 'crawling',
    pages_discovered: 1,
    pages_processed: 0,
    pages_failed: 0,
    current_page: websiteUrl,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = createAdminClient();

  // Insert initial job record into Supabase
  supabase
    .from('crawl_jobs')
    .insert(initialJob)
    .then(({ error }) => {
      if (error) console.error('[CrawlerRunner] Error initializing crawl_job in DB:', error.message);
    })
    .catch((err) => console.error('[CrawlerRunner] DB insert exception:', err));

  // Run Playwright crawl in the background
  runPlaywrightCrawl({
    jobId,
    chatbotId,
    workspaceId,
    startUrl: websiteUrl,
    maxPages,
  }).catch((err) => {
    console.error(`[CrawlerRunner] Playwright crawl failed for job ${jobId}:`, err);
  });

  return initialJob;
}
