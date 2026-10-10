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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const agent = await AgentService.getAgentById(workspaceId, params.id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ data: agent }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const body = await req.json();

    const updated = await AgentService.updateAgent(workspaceId, params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (body.tools && Array.isArray(body.tools)) {
      await AgentService.updateAgentTools(workspaceId, params.id, body.tools);
      updated.tools = body.tools;
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const deleted = await AgentService.deleteAgent(workspaceId, params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(
      { success: true, message: 'Agent archived successfully.' },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
