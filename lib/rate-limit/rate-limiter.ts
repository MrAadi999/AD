import { createAdminClient } from '../supabase/admin';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * Check rate limit via Upstash Redis REST API
 */
async function checkUpstashRateLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const endpoint = `${url}/pipeline`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds, 'NX'],
      ['TTL', key],
    ]),
  });

  if (!res.ok) {
    throw new Error(`Upstash returned status ${res.status}`);
  }

  const data = await res.json();
  const currentCount = Number(data[0]?.result || 1);
  const ttl = Number(data[2]?.result || windowSeconds);

  if (currentCount > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, ttl),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - currentCount),
    retryAfter: 0,
  };
}

/**
 * Check rate limit via Supabase Postgres database (rate_limits table)
 */
async function checkDatabaseRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();

  // 1. Fetch current bucket
  const { data: bucket, error: fetchError } = await supabase
    .from('rate_limits')
    .select('count, expires_at')
    .eq('key', key)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // If table is missing or DB issue, fail closed or log
    console.error('[RateLimiter] Database fetch error:', fetchError.message);
  }

  if (bucket) {
    const isExpired = new Date(bucket.expires_at).getTime() <= now.getTime();

    if (isExpired) {
      // Reset bucket
      await supabase
        .from('rate_limits')
        .update({ count: 1, expires_at: expiresAt })
        .eq('key', key);

      return { allowed: true, remaining: limit - 1, retryAfter: 0 };
    }

    if (bucket.count >= limit) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((new Date(bucket.expires_at).getTime() - now.getTime()) / 1000)
      );
      return { allowed: false, remaining: 0, retryAfter: remainingSeconds };
    }

    // Increment count
    const nextCount = bucket.count + 1;
    await supabase
      .from('rate_limits')
      .update({ count: nextCount })
      .eq('key', key);

    return { allowed: true, remaining: limit - nextCount, retryAfter: 0 };
  }

  // Create initial bucket
  await supabase
    .from('rate_limits')
    .insert({ key, count: 1, expires_at: expiresAt });

  return { allowed: true, remaining: limit - 1, retryAfter: 0 };
}

/**
 * Unified persistent rate limiter.
 * Prioritizes Upstash Redis if configured; otherwise persists to Supabase Postgres.
 * Never uses volatile in-memory Maps.
 */
export async function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken && !upstashUrl.includes('placeholder')) {
    try {
      return await checkUpstashRateLimit(upstashUrl, upstashToken, key, limit, windowSeconds);
    } catch (err: any) {
      console.warn('[RateLimiter] Upstash Redis call failed, failing over to Supabase Postgres:', err.message);
    }
  }

  try {
    return await checkDatabaseRateLimit(key, limit, windowSeconds);
  } catch (err: any) {
    console.error('[RateLimiter] Database rate limiting error:', err.message);
    // If database call fails, allow but log
    return { allowed: true, remaining: 1, retryAfter: 0 };
  }
}
