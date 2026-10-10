import { NextResponse, type NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { getChatbotByPublicId } from '@/lib/widget/widget-service';
import { isOriginAllowed } from '@/lib/widget/domain-validator';
import { checkWidgetRateLimit } from '@/lib/widget/rate-limiter';
import { processChatMessage } from '@/lib/chat/chat-service';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || request.headers.get('referer');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'invalid_json', message: 'Malformed JSON payload.' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const botId = body?.bot_id;
    const message = body?.message;
    let sessionId = body?.session_id;

    // 1. Input Validation
    if (!botId || typeof botId !== 'string') {
      return NextResponse.json(
        { error: 'invalid_bot_id', message: 'Valid bot_id is required.' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'empty_message', message: 'Message cannot be empty.' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: 'message_too_long', message: 'Message cannot exceed 4000 characters.' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 2. Anonymous Session Resolution
    if (!sessionId || typeof sessionId !== 'string') {
      sessionId = `bs_session_${crypto.randomBytes(8).toString('hex')}`;
    }

    // 3. Resolve Chatbot securely
    const bot = await getChatbotByPublicId(botId);

    if (!bot) {
      return NextResponse.json(
        { error: 'bot_not_found', message: 'Chatbot not found.' },
        {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 4. Check active status and widget enablement
    if (bot.status === 'paused') {
      return NextResponse.json(
        { error: 'bot_paused', message: 'This assistant is temporarily unavailable.' },
        {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (bot.widget_enabled === false) {
      return NextResponse.json(
        { error: 'widget_disabled', message: 'Chatbot widget is currently disabled.' },
        {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 5. Domain validation
    if (!isOriginAllowed(origin, bot.allowed_domains)) {
      return NextResponse.json(
        {
          error: 'unauthorized_domain',
          message: 'Origin domain is not permitted to use this chatbot widget.',
        },
        {
          status: 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 6. Rate Limiting Check
    const rateCheck = checkWidgetRateLimit({
      botId: bot.id || botId,
      sessionId,
      clientIp,
    });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(rateCheck.retryAfter || 60),
          },
        }
      );
    }

    // 7. Execute existing Step 6 RAG chat engine
    const workspaceId = bot.workspace_id || 'ws-demo-01';
    const internalBotId = bot.id || botId;

    const chatResult = await processChatMessage({
      workspaceId,
      chatbotId: internalBotId,
      userMessage: message,
      sessionId,
    });

    return NextResponse.json(
      {
        message: chatResult.message,
        sources: chatResult.sources,
        session_id: sessionId,
        conversation_id: chatResult.conversation_id,
        message_id: chatResult.message_id,
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      }
    );
  } catch (err: any) {
    console.error('[PublicChatAPI] Error:', err);
    return NextResponse.json(
      {
        error: 'server_error',
        message: 'Unable to process your request at this time. Please try again.',
      },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
