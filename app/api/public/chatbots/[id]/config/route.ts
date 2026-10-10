import { NextResponse, type NextRequest } from 'next/server';
import { getPublicChatbotConfig, getChatbotByPublicId } from '@/lib/widget/widget-service';
import { isOriginAllowed } from '@/lib/widget/domain-validator';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const publicId = params.id;
  const origin = request.headers.get('origin') || request.headers.get('referer');

  try {
    const fullBot = await getChatbotByPublicId(publicId);

    if (!fullBot) {
      return NextResponse.json(
        { error: 'bot_not_found', message: 'Chatbot not found.' },
        {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // 1. Domain security check
    if (!isOriginAllowed(origin, fullBot.allowed_domains)) {
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

    // 2. Resolve safe public config
    const { config, error, status } = await getPublicChatbotConfig(publicId);

    if (error || !config) {
      return NextResponse.json(
        { error: 'widget_disabled', message: error || 'Widget unavailable.' },
        {
          status: status || 403,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (err: any) {
    console.error('[PublicConfigAPI] Error:', err);
    return NextResponse.json(
      { error: 'server_error', message: 'Unable to retrieve chatbot configuration.' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
