import { checkRateLimit } from '../rate-limit/rate-limiter';

const DEFAULT_SESSION_LIMIT = parseInt(
  process.env.WIDGET_RATE_LIMIT_PER_MINUTE || '15',
  10
);

const DEFAULT_GLOBAL_BOT_LIMIT = parseInt(
  process.env.WIDGET_RATE_LIMIT_GLOBAL_PER_MINUTE || '60',
  10
);

/**
 * Check rate limit for a public widget request using persistent database / Upstash Redis store.
 * Returns allowed: boolean and retryAfter seconds if rate limited.
 */
export async function checkWidgetRateLimit(params: {
  botId: string;
  sessionId?: string;
  clientIp?: string;
  sessionLimit?: number;
  botLimit?: number;
}): Promise<{ allowed: boolean; retryAfter?: number }> {
  const { botId, sessionId, clientIp } = params;
  const sessionMax = params.sessionLimit ?? DEFAULT_SESSION_LIMIT;
  const botMax = params.botLimit ?? DEFAULT_GLOBAL_BOT_LIMIT;

  const sessionKey = sessionId || clientIp || 'anon-session';
  const fullSessionKey = `widget:session:${botId}:${sessionKey}`;
  const globalBotKey = `widget:bot:${botId}`;

  // 1. Session / IP limit check (window: 60s)
  const sessionCheck = await checkRateLimit(fullSessionKey, sessionMax, 60);
  if (!sessionCheck.allowed) {
    return { allowed: false, retryAfter: sessionCheck.retryAfter };
  }

  // 2. Global bot limit check (window: 60s)
  const botCheck = await checkRateLimit(globalBotKey, botMax, 60);
  if (!botCheck.allowed) {
    return { allowed: false, retryAfter: botCheck.retryAfter };
  }

  return { allowed: true };
}
