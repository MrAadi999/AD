// In-memory sliding window rate limiter for public widget traffic
const sessionLimitMap = new Map<string, number[]>();
const botLimitMap = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 1 minute sliding window

const DEFAULT_SESSION_LIMIT = parseInt(
  process.env.WIDGET_RATE_LIMIT_PER_MINUTE || '15',
  10
);

const DEFAULT_GLOBAL_BOT_LIMIT = parseInt(
  process.env.WIDGET_RATE_LIMIT_GLOBAL_PER_MINUTE || '60',
  10
);

/**
 * Check rate limit for a public widget request
 * Returns allowed: boolean and retryAfter seconds if rate limited
 */
export function checkWidgetRateLimit(params: {
  botId: string;
  sessionId?: string;
  clientIp?: string;
  sessionLimit?: number;
  botLimit?: number;
}): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const { botId, sessionId, clientIp } = params;
  const sessionMax = params.sessionLimit ?? DEFAULT_SESSION_LIMIT;
  const botMax = params.botLimit ?? DEFAULT_GLOBAL_BOT_LIMIT;

  // 1. Session / IP limit check
  const sessionKey = sessionId || clientIp || 'anon-session';
  const fullSessionKey = `${botId}:${sessionKey}`;

  const sessionTimestamps = (sessionLimitMap.get(fullSessionKey) || []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (sessionTimestamps.length >= sessionMax) {
    const oldest = sessionTimestamps[0];
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    return { allowed: false, retryAfter };
  }

  // 2. Global bot limit check
  const botTimestamps = (botLimitMap.get(botId) || []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (botTimestamps.length >= botMax) {
    const oldest = botTimestamps[0];
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    return { allowed: false, retryAfter };
  }

  // Record timestamp
  sessionTimestamps.push(now);
  sessionLimitMap.set(fullSessionKey, sessionTimestamps);

  botTimestamps.push(now);
  botLimitMap.set(botId, botTimestamps);

  return { allowed: true };
}

/**
 * Reset rate limit entries for testing
 */
export function resetRateLimits() {
  sessionLimitMap.clear();
  botLimitMap.clear();
}
