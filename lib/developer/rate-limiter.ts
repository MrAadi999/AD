import { checkRateLimit } from '../rate-limit/rate-limiter';

const DEFAULT_RATE_LIMIT = parseInt(
  process.env.API_KEY_RATE_LIMIT_PER_MINUTE || '100',
  10
);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix epoch seconds
  retryAfter?: number; // seconds
}

/**
 * Check rate limit for an authenticated API key request using persistent store.
 */
export async function checkApiKeyRateLimit(
  apiKeyId: string,
  customLimit?: number
): Promise<RateLimitResult> {
  const limit = customLimit ?? DEFAULT_RATE_LIMIT;
  const now = Date.now();
  const key = `api_key:${apiKeyId}`;

  const res = await checkRateLimit(key, limit, 60);
  const resetEpoch = Math.ceil((now + 60000) / 1000);

  return {
    allowed: res.allowed,
    limit,
    remaining: res.remaining,
    reset: resetEpoch,
    retryAfter: res.retryAfter,
  };
}
