import * as crypto from 'crypto';
import { createAdminClient } from '../supabase/admin';
import { isSupabaseConfigured } from '../supabase/client';
import { ApiRequestLogRecord, ApiUsageRecord, UsageSummary } from './types';
import { ChatbotService } from '../chatbot/service';

/**
 * Record an API usage event strictly in Supabase Postgres.
 */
export async function recordApiUsage(
  entry: Omit<ApiUsageRecord, 'id' | 'created_at'>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn('[UsageService] Supabase not configured, skipping usage record');
    return;
  }

  const record: ApiUsageRecord = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...entry,
  };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('api_usage').insert({
      id: record.id,
      workspace_id: record.workspace_id,
      api_key_id: record.api_key_id,
      chatbot_id: record.chatbot_id,
      request_id: record.request_id,
      endpoint: record.endpoint,
      method: record.method,
      status_code: record.status_code,
      input_tokens: record.input_tokens,
      output_tokens: record.output_tokens,
      total_tokens: record.total_tokens,
      latency_ms: record.latency_ms,
      created_at: record.created_at,
    });

    if (error) {
      console.warn('[UsageService] Supabase usage insert error:', error.message);
    }
  } catch (err: any) {
    console.warn('[UsageService] Supabase client error:', err.message);
  }
}

/**
 * Record an API request log entry strictly in Supabase Postgres.
 */
export async function recordApiLog(
  entry: Omit<ApiRequestLogRecord, 'id' | 'created_at'>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const record: ApiRequestLogRecord = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...entry,
  };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('api_request_logs').insert({
      id: record.id,
      workspace_id: record.workspace_id,
      api_key_id: record.api_key_id,
      chatbot_id: record.chatbot_id,
      request_id: record.request_id,
      method: record.method,
      path: record.path,
      status_code: record.status_code,
      latency_ms: record.latency_ms,
      error_code: record.error_code || null,
      created_at: record.created_at,
    });

    if (error) {
      console.warn('[UsageService] Supabase log insert error:', error.message);
    }
  } catch (err: any) {
    console.warn('[UsageService] Supabase client error:', err.message);
  }
}

/**
 * Get aggregated API usage summary strictly from Supabase Postgres.
 */
export async function getUsageSummary(
  workspaceId: string,
  timeframe: 'today' | '7d' | '30d' = '7d'
): Promise<UsageSummary> {
  if (!workspaceId) {
    throw new Error('Workspace ID is required to fetch usage summary.');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const now = new Date();
  let cutoffDate = new Date();
  if (timeframe === 'today') {
    cutoffDate.setHours(0, 0, 0, 0);
  } else if (timeframe === '7d') {
    cutoffDate.setDate(now.getDate() - 7);
  } else {
    cutoffDate.setDate(now.getDate() - 30);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('api_usage')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Database error fetching API usage: ${error.message}`);
  }

  const records: ApiUsageRecord[] = (data as ApiUsageRecord[]) || [];

  let totalRequests = records.length;
  let successfulRequests = 0;
  let failedRequests = 0;
  let tokensUsed = 0;
  let totalLatency = 0;
  let rateLimitedCount = 0;

  const bucketMap = new Map<string, { requests: number; tokens: number; errors: number }>();

  for (const r of records) {
    if (r.status_code >= 200 && r.status_code < 400) {
      successfulRequests++;
    } else {
      failedRequests++;
    }

    if (r.status_code === 429) {
      rateLimitedCount++;
    }

    tokensUsed += r.total_tokens || 0;
    totalLatency += r.latency_ms || 0;

    const dateObj = new Date(r.created_at);
    const bucketKey =
      timeframe === 'today'
        ? `${dateObj.getHours()}:00`
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const existing = bucketMap.get(bucketKey) || { requests: 0, tokens: 0, errors: 0 };
    existing.requests += 1;
    existing.tokens += r.total_tokens || 0;
    if (r.status_code >= 400) existing.errors += 1;
    bucketMap.set(bucketKey, existing);
  }

  const avgLatency = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
  const timeSeries = Array.from(bucketMap.entries()).map(([timestamp, bData]) => ({
    timestamp,
    ...bData,
  }));

  return {
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    failed_requests: failedRequests,
    rate_limited_requests: rateLimitedCount,
    tokens_used: tokensUsed,
    average_latency_ms: avgLatency,
    time_series: timeSeries,
  };
}

/**
 * List recent request logs strictly from Supabase Postgres.
 */
export async function listApiLogs(
  workspaceId: string,
  options?: { limit?: number; offset?: number; keyId?: string }
): Promise<ApiRequestLogRecord[]> {
  if (!workspaceId) return [];

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const supabase = createAdminClient();
  let query = supabase
    .from('api_request_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.keyId) {
    query = query.eq('api_key_id', options.keyId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Database error fetching API logs: ${error.message}`);
  }

  const logs: ApiRequestLogRecord[] = (data as ApiRequestLogRecord[]) || [];

  // Enrich logs with bot names if available
  try {
    const bots = await ChatbotService.getChatbots(workspaceId);
    const botMap = new Map<string, string>();
    for (const b of bots) {
      if (b.id) botMap.set(b.id, b.name);
    }
    for (const log of logs) {
      if (log.chatbot_id && botMap.has(log.chatbot_id)) {
        log.bot_name = botMap.get(log.chatbot_id);
      }
    }
  } catch {}

  return logs;
}
