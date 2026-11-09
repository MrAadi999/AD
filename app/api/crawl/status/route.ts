import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
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

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database error: Supabase is not configured.' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden: No active workspace' }, { status: 403 });
    }

    const workspaceId = member.workspace_id;
    let query = supabase
      .from('crawl_jobs')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (jobId) {
      query = query.eq('id', jobId);
    } else if (chatbotId) {
      query = query.eq('chatbot_id', chatbotId).order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No crawl job found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: data as CrawlJob });
  } catch (err: any) {
    console.error('[CrawlStatusAPI] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch crawl job status.' },
      { status: 500 }
    );
  }
}
