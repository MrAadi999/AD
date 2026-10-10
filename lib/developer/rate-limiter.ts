// In-memory sliding window rate limiter for Developer API requests
const keyTimestampMap = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 60 seconds

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
 * Check rate limit for an authenticated API key request
 */
export function checkApiKeyRateLimit(
  apiKeyId: string,
  customLimit?: number
): RateLimitResult {
  const limit = customLimit ?? DEFAULT_RATE_LIMIT;
  const now = Date.now();
  const resetEpoch = Math.ceil((now + WINDOW_MS) / 1000);

  const timestamps = (keyTimestampMap.get(apiKeyId) || []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: Math.ceil((oldest + WINDOW_MS) / 1000),
      retryAfter,
    };
  }

  // Record this request
  timestamps.push(now);
  keyTimestampMap.set(apiKeyId, timestamps);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - timestamps.length),
    reset: resetEpoch,
  };
}

/**
 * Reset rate limits for testing
 */
export function resetApiKeyRateLimits(): void {
  keyTimestampMap.clear();
}
