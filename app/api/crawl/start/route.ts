import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { startBackgroundCrawl } from '@/lib/crawler/runner';
import { validateUrl } from '@/lib/chatbot/validation';
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

      // Securely fetch user workspace
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'No workspace found for authenticated user.' },
          { status: 403 }
        );
      }

      workspaceId = member.workspace_id;

      // Verify chatbot belongs to workspace
      const { data: botData, error: botError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('id', chatbot_id)
        .single();

      if (botError || !botData) {
        return NextResponse.json(
          { error: 'Chatbot not found in your workspace.' },
          { status: 404 }
        );
      }

      chatbot = botData;
    } else {
      // Offline / demo fallback
      chatbot = getServerChatbot(chatbot_id) || (await ChatbotService.getChatbotById(workspaceId, chatbot_id));
      if (!chatbot) {
        chatbot = {
          id: chatbot_id,
          workspace_id: workspaceId,
          name: 'AI Assistant',
          website_url: bodyUrl?.trim() || '',
        };
      }
    }

    const crawlUrl = bodyUrl?.trim() || chatbot.website_url;
    if (bodyUrl?.trim()) {
      chatbot.website_url = bodyUrl.trim();
      updateServerChatbot(chatbot_id, { website_url: bodyUrl.trim() });
    }

    // Verify website_url exists
    if (!crawlUrl || !crawlUrl.trim()) {
      return NextResponse.json(
        { error: 'Connect a website first.' },
        { status: 400 }
      );
    }

    // SSRF / URL validation
    const urlValidation = validateUrl(crawlUrl);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error || 'Invalid website URL format.' },
        { status: 400 }
      );
    }

    const jobId = 'crawl-' + Math.random().toString(36).substring(2, 10);

    // If Supabase is configured, create the crawl_job record
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      await supabase.from('crawl_jobs').insert({
        id: jobId,
        workspace_id: workspaceId,
        chatbot_id: chatbot_id,
        start_url: crawlUrl,
        status: 'queued',
        pages_discovered: 1,
        pages_processed: 0,
        pages_failed: 0,
        current_page: crawlUrl,
        started_at: new Date().toISOString(),
      });
    }

    // Launch background crawl
    const job = startBackgroundCrawl(
      jobId,
      chatbot_id,
      workspaceId,
      crawlUrl
    );

    return NextResponse.json(
      {
        message: 'Crawl started successfully.',
        job_id: jobId,
        chatbot_id,
        status: job.status,
        start_url: crawlUrl,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Error starting crawl:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to start crawl.' },
      { status: 500 }
    );
  }
}
