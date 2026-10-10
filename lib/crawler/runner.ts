import path from 'path';
import fs from 'fs';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { CrawlJob, KnowledgeSource } from './types';

const JOBS_DIR = path.join(process.cwd(), '.next', 'crawl_jobs');

function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) {
    try {
      fs.mkdirSync(JOBS_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

// In-memory store for jobs and knowledge sources (used for demo fallback or rapid polling)
export const inMemoryCrawlJobs = new Map<string, CrawlJob>();
export const inMemoryKnowledgeSources = new Map<string, KnowledgeSource[]>();

export function getJobStateFile(jobId: string): string {
  ensureJobsDir();
  return path.join(JOBS_DIR, `${jobId}.json`);
}

export function readJobStateFromFile(jobId: string): any | null {
  const filePath = getJobStateFile(jobId);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export async function getLatestJobForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<CrawlJob | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('crawl_jobs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) return data;
    } catch {
      // fallback
    }
  }

  // Fallback to in-memory/file
  for (const job of Array.from(inMemoryCrawlJobs.values()).reverse()) {
    if (job.chatbot_id === chatbotId && job.workspace_id === workspaceId) {
      // Merge with file if exists
      const fileData = readJobStateFromFile(job.id);
      if (fileData) {
        job.status = fileData.status || job.status;
        job.pages_discovered = fileData.pages_discovered ?? job.pages_discovered;
        job.pages_processed = fileData.pages_processed ?? job.pages_processed;
        job.pages_failed = fileData.pages_failed ?? job.pages_failed;
        job.current_page = fileData.current_page ?? job.current_page;
        job.error_message = fileData.error_message ?? job.error_message;
        job.started_at = fileData.started_at ?? job.started_at;
        job.completed_at = fileData.completed_at ?? job.completed_at;
      }
      if (job.completed_at || (job.pages_discovered > 0 && job.pages_processed >= job.pages_discovered)) {
        if (job.status === 'crawling') {
          job.status = 'completed';
        }
      }
      return job;
    }
  }

  // If not found in memory, scan disk crawl jobs directory
  ensureJobsDir();
  try {
    const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith('.json'));
    const matchedJobs: CrawlJob[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(JOBS_DIR, file), 'utf-8');
        const data = JSON.parse(raw);
        if (data.chatbot_id === chatbotId) {
          const isDone = Boolean(data.completed_at) || (data.pages_discovered > 0 && data.pages_processed >= data.pages_discovered);
          const resolvedStatus = isDone ? 'completed' : (data.status || 'completed');
          matchedJobs.push({
            id: data.id || file.replace('.json', ''),
            workspace_id: data.workspace_id || workspaceId,
            chatbot_id: chatbotId,
            start_url: data.start_url || '',
            status: resolvedStatus as any,
            pages_discovered: data.pages_discovered || 0,
            pages_processed: data.pages_processed || 0,
            pages_failed: data.pages_failed || 0,
            current_page: data.current_page || null,
            error_message: data.error_message || null,
            started_at: data.started_at || null,
            completed_at: data.completed_at || null,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          });
        }
      } catch {}
    }
    if (matchedJobs.length > 0) {
      matchedJobs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      const best = matchedJobs[0];
      inMemoryCrawlJobs.set(best.id, best);
      return best;
    }
  } catch {}

  return null;
}

const SOURCES_CACHE_DIR = path.join(process.cwd(), '.next', 'knowledge_cache');

function ensureSourcesCacheDir() {
  if (!fs.existsSync(SOURCES_CACHE_DIR)) {
    try {
      fs.mkdirSync(SOURCES_CACHE_DIR, { recursive: true });
    } catch {}
  }
}

export function getSourcesCacheFile(chatbotId: string): string {
  ensureSourcesCacheDir();
  return path.join(SOURCES_CACHE_DIR, `sources_${chatbotId}.json`);
}

export function loadSourcesFromDisk(chatbotId: string): KnowledgeSource[] {
  try {
    const f = getSourcesCacheFile(chatbotId);
    if (fs.existsSync(f)) {
      return JSON.parse(fs.readFileSync(f, 'utf-8'));
    }
  } catch {}
  return [];
}

export function saveSourcesToDisk(chatbotId: string, sources: KnowledgeSource[]): void {
  try {
    const f = getSourcesCacheFile(chatbotId);
    fs.writeFileSync(f, JSON.stringify(sources, null, 2));
  } catch {}
}

export async function getKnowledgeSourcesForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<KnowledgeSource[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId)
        .order('crawled_at', { ascending: false });

      if (data) return data;
    } catch {
      // fallback
    }
  }

  let sources = inMemoryKnowledgeSources.get(chatbotId);
  if (!sources || sources.length === 0) {
    sources = loadSourcesFromDisk(chatbotId);
    if (!sources || sources.length === 0) {
      // Auto-hydrate from crawl jobs if available
      ensureJobsDir();
      try {
        const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(JOBS_DIR, file), 'utf-8');
            const jobData = JSON.parse(raw);
            if (jobData.chatbot_id === chatbotId && Array.isArray(jobData.pages) && jobData.pages.length > 0) {
              sources = jobData.pages.map((p: any) => ({
                id: 'src-' + Math.random().toString(36).substring(2, 9),
                workspace_id: workspaceId,
                chatbot_id: chatbotId,
                source_type: 'website' as const,
                url: p.url,
                title: p.title,
                content: p.content,
                content_hash: p.content_hash,
                status: p.status === 'completed' ? ('completed' as const) : ('failed' as const),
                word_count: p.word_count || 0,
                crawled_at: jobData.completed_at || new Date().toISOString(),
                created_at: jobData.created_at || new Date().toISOString(),
                updated_at: jobData.updated_at || new Date().toISOString(),
              }));
              break;
            }
          } catch {}
        }
      } catch {}
    }
    if (sources && sources.length > 0) {
      inMemoryKnowledgeSources.set(chatbotId, sources);
      saveSourcesToDisk(chatbotId, sources);
    }
  }

  return sources || [];
}

export async function deleteKnowledgeSource(
  workspaceId: string,
  chatbotId: string,
  sourceId: string
): Promise<boolean> {
  const existingSources = inMemoryKnowledgeSources.get(chatbotId) || [];
  inMemoryKnowledgeSources.set(
    chatbotId,
    existingSources.filter((s) => s.id !== sourceId)
  );

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase
        .from('knowledge_sources')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId)
        .eq('id', sourceId);
    } catch (err: any) {
      console.warn('[CRAWLER RUNNER] Error deleting source from supabase:', err.message);
    }
  }

  return true;
}

export async function addOrUpdateKnowledgeSource(
  workspaceId: string,
  chatbotId: string,
  source: KnowledgeSource
): Promise<void> {
  const existingSources = inMemoryKnowledgeSources.get(chatbotId) || [];
  const sourceMap = new Map<string, KnowledgeSource>();
  for (const s of existingSources) {
    sourceMap.set(s.id, s);
  }
  sourceMap.set(source.id, source);
  const updatedSources = Array.from(sourceMap.values());
  inMemoryKnowledgeSources.set(chatbotId, updatedSources);
  saveSourcesToDisk(chatbotId, updatedSources);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('knowledge_sources').upsert({
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
      }, { onConflict: 'chatbot_id,url' });
    } catch (err: any) {
      console.warn('[CRAWLER RUNNER] Failed saving source to Supabase:', err.message);
    }
  }
}

/**
 * Launch the Python crawler as a background process
 */
export function startBackgroundCrawl(
  jobId: string,
  chatbotId: string,
  workspaceId: string,
  websiteUrl: string
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

  inMemoryCrawlJobs.set(jobId, initialJob);

  const outputFile = getJobStateFile(jobId);
  fs.writeFileSync(outputFile, JSON.stringify(initialJob, null, 2));

  // Run high-performance native crawler in background
  import('./native-crawler')
    .then(({ runNativeCrawl }) => {
      console.log(`[CRAWLER RUNNER] Starting native crawl for ${websiteUrl} (Job: ${jobId})`);
      runNativeCrawl(jobId, chatbotId, workspaceId, websiteUrl)
        .then(() => {
          console.log(`[CRAWLER RUNNER] Native crawl finished successfully for ${jobId}`);
          initialJob.status = 'completed';
          initialJob.completed_at = new Date().toISOString();
          initialJob.updated_at = new Date().toISOString();
          inMemoryCrawlJobs.set(jobId, initialJob);
          try {
            const diskState = readJobStateFromFile(jobId) || {};
            diskState.status = 'completed';
            diskState.completed_at = diskState.completed_at || initialJob.completed_at;
            diskState.updated_at = initialJob.updated_at;
            fs.writeFileSync(outputFile, JSON.stringify(diskState, null, 2));
          } catch {}
        })
        .catch((err) => {
          console.error(`[CRAWLER RUNNER] Native crawl failed for ${jobId}:`, err);
          initialJob.status = 'failed';
          initialJob.error_message = err?.message || 'Crawl error';
          initialJob.completed_at = new Date().toISOString();
          initialJob.updated_at = new Date().toISOString();
          inMemoryCrawlJobs.set(jobId, initialJob);
          try {
            fs.writeFileSync(outputFile, JSON.stringify(initialJob, null, 2));
          } catch {}
        });
    })
    .catch((err) => {
      console.error('[CRAWLER RUNNER] Could not import native-crawler:', err);
    });

  return initialJob;
}
