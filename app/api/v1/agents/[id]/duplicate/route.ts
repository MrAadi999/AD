import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '@/lib/agents/agent-service';
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const duplicated = await AgentService.duplicateAgent(workspaceId, params.id);
    if (!duplicated) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ data: duplicated }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to duplicate agent' },
      { status: 500 }
    );
  }
}
