import { NextRequest, NextResponse } from 'next/server';
import { authenticateBearerKey } from '@/lib/developer/key-service';
import { generateRequestId } from '@/lib/developer/request-id';
import { ChatbotService } from '@/lib/chatbot/service';
import { recordApiLog } from '@/lib/developer/usage-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': requestId,
  };

  const authHeader = req.headers.get('authorization');
  const authResult = await authenticateBearerKey(authHeader);

  if (!authResult.ok || !authResult.apiKey) {
    return NextResponse.json(
      {
        error: {
          code: authResult.code || 'invalid_api_key',
          message: authResult.message || 'Unauthorized',
        },
        request_id: requestId,
      },
      { status: authResult.status || 401, headers: corsHeaders }
    );
  }

  const apiKey = authResult.apiKey;
  const chatbots = await ChatbotService.getChatbots(apiKey.workspace_id);

  const safeChatbots = chatbots.map((b) => ({
    id: b.id,
    public_id: b.public_id,
    name: b.name,
    assistant_name: b.assistant_name,
    status: b.status || 'active',
    website_url: b.website_url,
    created_at: b.created_at,
  }));

  await recordApiLog({
    workspace_id: apiKey.workspace_id,
    api_key_id: apiKey.id,
    chatbot_id: null,
    request_id: requestId,
    method: 'GET',
    path: '/v1/chatbots',
    status_code: 200,
    latency_ms: Date.now() - startTime,
  });

  return NextResponse.json(
    {
      data: safeChatbots,
      request_id: requestId,
    },
    { status: 200, headers: corsHeaders }
  );
}
