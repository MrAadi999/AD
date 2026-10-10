import { NextRequest, NextResponse } from 'next/server';
import { getUsageSummary } from '@/lib/developer/usage-service';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const runtime = 'nodejs';

async function resolveWorkspaceId(req: NextRequest): Promise<string> {
  const url = new URL(req.url);
  const paramWs = url.searchParams.get('workspace_id');
  if (paramWs) return paramWs;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (member?.workspace_id) return member.workspace_id;
      }
    } catch {
      // Fallback
    }
  }

  return 'ws-demo-01';
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const url = new URL(req.url);
    const timeframeParam = (url.searchParams.get('timeframe') || '7d') as
      | 'today'
      | '7d'
      | '30d';

    const summary = await getUsageSummary(workspaceId, timeframeParam);
    return NextResponse.json({ data: summary }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch usage summary' },
      { status: 500 }
    );
  }
}
