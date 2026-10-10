import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { startBackgroundCrawl } from '@/lib/crawler/runner';
import { ChatbotService } from '@/lib/chatbot/service';
import { getServerChatbot, updateServerChatbot } from '@/lib/chatbot/server-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatbot_id, website_url: bodyUrl } = body;

    if (!chatbot_id) {
      return NextResponse.json(
        { error: 'Missing chatbot_id parameter.' },
        { status: 400 }
      );
    }

    let workspaceId = 'ws-demo-01';
    let chatbot: any = null;

    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: 'Workspace not found.' },
          { status: 403 }
        );
      }

      workspaceId = member.workspace_id;

      const { data: bot } = await supabase
        .from('chatbots')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('id', chatbot_id)
        .single();

      if (!bot) {
        return NextResponse.json(
          { error: 'Chatbot not found.' },
          { status: 404 }
        );
      }

      chatbot = bot;
    } else {
      chatbot = getServerChatbot(chatbot_id) || (await ChatbotService.getChatbotById(workspaceId, chatbot_id));
      if (!chatbot) {
        chatbot = {
          id: chatbot_id,
          workspace_id: workspaceId,
          website_url: bodyUrl?.trim() || '',
        };
      }
    }

    const crawlUrl = bodyUrl?.trim() || chatbot.website_url;
    if (bodyUrl?.trim()) {
      chatbot.website_url = bodyUrl.trim();
      updateServerChatbot(chatbot_id, { website_url: bodyUrl.trim() });
    }

    if (!crawlUrl) {
      return NextResponse.json(
        { error: 'Connect a website first.' },
        { status: 400 }
      );
    }

    const jobId = 'crawl-' + Math.random().toString(36).substring(2, 10);

    const job = startBackgroundCrawl(
      jobId,
      chatbot_id,
      workspaceId,
      crawlUrl
    );

    return NextResponse.json({
      message: 'Crawl restarted successfully.',
      job_id: jobId,
      status: job.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to retry crawl.' },
      { status: 500 }
    );
  }
}
