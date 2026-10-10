import { NextRequest, NextResponse } from 'next/server';
import { authenticateBearerKey } from '@/lib/developer/key-service';
import { checkApiKeyRateLimit } from '@/lib/developer/rate-limiter';
import { recordApiLog, recordApiUsage } from '@/lib/developer/usage-service';
import { generateRequestId } from '@/lib/developer/request-id';
import { ChatbotService } from '@/lib/chatbot/service';
import { getChatbotByPublicId } from '@/lib/widget/widget-service';
import { processChatMessage } from '@/lib/chat/chat-service';

export const runtime = 'nodejs';

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    },
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': requestId,
  };

  // Helper error response
  const errorResponse = (
    status: number,
    code: string,
    message: string,
    extraHeaders?: Record<string, string>
  ) => {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json(
      {
        error: {
          code,
          message,
        },
        request_id: requestId,
      },
      {
        status,
        headers: {
          ...corsHeaders,
          ...(extraHeaders || {}),
        },
      }
    );
  };

  // 1. Authenticate API Key
  const authHeader = req.headers.get('authorization');
  const authResult = await authenticateBearerKey(authHeader);

  if (!authResult.ok || !authResult.apiKey) {
    await recordApiLog({
      workspace_id: 'unauthenticated',
      api_key_id: null,
      chatbot_id: null,
      request_id: requestId,
      method: 'POST',
      path: '/v1/chat',
      status_code: authResult.status || 401,
      latency_ms: Date.now() - startTime,
      error_code: authResult.code,
    });

    return errorResponse(
      authResult.status || 401,
      authResult.code || 'invalid_api_key',
      authResult.message || 'Unauthorized API key'
    );
  }

  const apiKey = authResult.apiKey;

  // 2. Server-side Rate Limiting
  const rateLimit = checkApiKeyRateLimit(apiKey.id);
  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.reset),
    ...(rateLimit.retryAfter ? { 'Retry-After': String(rateLimit.retryAfter) } : {}),
  };

  if (!rateLimit.allowed) {
    await recordApiLog({
      workspace_id: apiKey.workspace_id,
      api_key_id: apiKey.id,
      chatbot_id: null,
      request_id: requestId,
      method: 'POST',
      path: '/v1/chat',
      status_code: 429,
      latency_ms: Date.now() - startTime,
      error_code: 'rate_limit_exceeded',
    });

    return errorResponse(
      429,
      'rate_limit_exceeded',
      'Too many requests. Please try again later.',
      rateLimitHeaders
    );
  }

  // 3. Parse and Validate Request Body
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return errorResponse(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const { bot_id, message, session_id } = body || {};

  if (!bot_id || typeof bot_id !== 'string') {
    return errorResponse(
      400,
      'missing_parameter',
      'The "bot_id" parameter is required.'
    );
  }

  const cleanMessage = (message || '').trim();
  if (!cleanMessage) {
    return errorResponse(
      400,
      'empty_message',
      'The "message" parameter cannot be empty.'
    );
  }

  if (cleanMessage.length > 4000) {
    return errorResponse(
      422,
      'message_too_long',
      'The "message" parameter exceeds maximum allowed length of 4000 characters.'
    );
  }

  // 4. Resolve Chatbot
  let chatbot = await getChatbotByPublicId(bot_id);
  if (!chatbot) {
    chatbot = await ChatbotService.getChatbotById(apiKey.workspace_id, bot_id);
  }

  if (!chatbot) {
    await recordApiLog({
      workspace_id: apiKey.workspace_id,
      api_key_id: apiKey.id,
      chatbot_id: null,
      request_id: requestId,
      method: 'POST',
      path: '/v1/chat',
      status_code: 404,
      latency_ms: Date.now() - startTime,
      error_code: 'chatbot_not_found',
    });

    return errorResponse(
      404,
      'chatbot_not_found',
      `Chatbot with identifier "${bot_id}" was not found.`
    );
  }

  // 5. CRITICAL MULTI-TENANT OWNERSHIP VERIFICATION
  // A key from Workspace A must never call a chatbot belonging to Workspace B!
  if (chatbot.workspace_id !== apiKey.workspace_id) {
    await recordApiLog({
      workspace_id: apiKey.workspace_id,
      api_key_id: apiKey.id,
      chatbot_id: chatbot.id || null,
      request_id: requestId,
      method: 'POST',
      path: '/v1/chat',
      status_code: 403,
      latency_ms: Date.now() - startTime,
      error_code: 'forbidden',
    });

    return errorResponse(
      403,
      'forbidden',
      'You do not have permission to access this chatbot from your workspace.'
    );
  }

  // 6. Chatbot Status Check
  if (chatbot.status === 'paused') {
    await recordApiLog({
      workspace_id: apiKey.workspace_id,
      api_key_id: apiKey.id,
      chatbot_id: chatbot.id || null,
      request_id: requestId,
      method: 'POST',
      path: '/v1/chat',
      status_code: 403,
      latency_ms: Date.now() - startTime,
      error_code: 'chatbot_inactive',
    });

    return errorResponse(
      403,
      'chatbot_inactive',
      'This chatbot is currently paused or inactive.'
    );
  }

  // 7. Execute Step 6 RAG Engine
  try {
    const ragResponse = await processChatMessage({
      workspaceId: apiKey.workspace_id,
      chatbotId: chatbot.id!,
      userMessage: cleanMessage,
      sessionId: session_id,
    });

    const latencyMs = Date.now() - startTime;

    // Estimate token metrics
    const inputTokens = Math.max(1, Math.ceil(cleanMessage.length / 4));
    const outputTokens = Math.max(1, Math.ceil(ragResponse.message.length / 4));
    const totalTokens = inputTokens + outputTokens;

    // Record Telemetry & Request Log asynchronously
    await Promise.all([
      recordApiUsage({
        workspace_id: apiKey.workspace_id,
        api_key_id: apiKey.id,
        chatbot_id: chatbot.id || null,
        request_id: requestId,
        endpoint: '/v1/chat',
        method: 'POST',
        status_code: 200,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
      }),
      recordApiLog({
        workspace_id: apiKey.workspace_id,
        api_key_id: apiKey.id,
        chatbot_id: chatbot.id || null,
        request_id: requestId,
        method: 'POST',
        path: '/v1/chat',
        status_code: 200,
        latency_ms: latencyMs,
      }),
    ]);

    const formattedResponse = {
      id: ragResponse.message_id || `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      object: 'chat.response' as const,
      bot_id: chatbot.public_id || chatbot.id || bot_id,
      message: ragResponse.message,
      sources: ragResponse.sources || [],
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
      },
      created_at: new Date().toISOString(),
      request_id: requestId,
    };

    return NextResponse.json(formattedResponse, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...rateLimitHeaders,
      },
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    await recordApiLog({
      workspace_id: apiKey.workspace_id,
      api_key_id: apiKey.id,
      chatbot_id: chatbot.id || null,
      request_id: requestId,
      method: 'POST',
      path: '/v1/chat',
      status_code: 500,
      latency_ms: latencyMs,
      error_code: 'internal_error',
    });

    return errorResponse(
      500,
      'internal_error',
      err.message || 'An internal error occurred while processing your request.'
    );
  }
}
