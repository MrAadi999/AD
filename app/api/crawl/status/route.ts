import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getLatestJobForChatbot,
  readJobStateFromFile,
  inMemoryCrawlJobs,
} from '@/lib/crawler/runner';
import { CrawlJob } from '@/lib/crawler/types';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const chatbotId = url.searchParams.get('chatbot_id');
    const jobId = url.searchParams.get('job_id');

    if (!chatbotId && !jobId) {
      return NextResponse.json(
        { error: 'Missing chatbot_id or job_id parameter.' },
        { status: 400 }
      );
    }

    let workspaceId = 'ws-demo-01';

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

      if (member) {
        workspaceId = member.workspace_id;
      }
    }

    let job: CrawlJob | null = null;

    if (jobId) {
      job = inMemoryCrawlJobs.get(jobId) || null;
      const fileData = readJobStateFromFile(jobId);
      if (fileData) {
        job = {
          id: jobId,
          workspace_id: fileData.workspace_id || workspaceId,
          chatbot_id: fileData.chatbot_id || (chatbotId || ''),
          start_url: fileData.start_url || '',
          status: fileData.status || 'crawling',
          pages_discovered: fileData.pages_discovered || 0,
          pages_processed: fileData.pages_processed || 0,
          pages_failed: fileData.pages_failed || 0,
          current_page: fileData.current_page || null,
          error_message: fileData.error_message || null,
          started_at: fileData.started_at || null,
          completed_at: fileData.completed_at || null,
          created_at: fileData.started_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    if (!job && chatbotId) {
      job = await getLatestJobForChatbot(workspaceId, chatbotId);
    }

    if (!job) {
      return NextResponse.json(
        { error: 'No active or recent crawl job found.' },
        { status: 404 }
      );
    }

    // Normalize completed status
    const isDone = Boolean(job.completed_at) || (job.pages_discovered > 0 && job.pages_processed >= job.pages_discovered);
    if (isDone && job.status !== 'failed') {
      job.status = 'completed';
    }

    // Compute progress percentage
    let percent = 0;
    if (job.status === 'completed' || isDone) {
      percent = 100;
    } else if (job.status === 'failed') {
      percent = 100;
    } else if (job.pages_discovered > 0) {
      percent = Math.min(
        95,
        Math.max(
          10,
          Math.round((job.pages_processed / Math.max(job.pages_discovered, 1)) * 100)
        )
      );
    } else {
      percent = 10;
    }

    return NextResponse.json({
      job,
      percent_complete: percent,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch crawl status.' },
      { status: 500 }
    );
  }
}
