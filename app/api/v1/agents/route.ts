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

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const agents = await AgentService.getAgents(workspaceId);
    return NextResponse.json({ data: agents }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list agents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const body = await req.json();

    if (!body.name || !body.purpose || !body.system_instructions) {
      return NextResponse.json(
        { error: 'Fields "name", "purpose", and "system_instructions" are required.' },
        { status: 400 }
      );
    }

    const agent = await AgentService.createAgent(workspaceId, {
      name: body.name,
      description: body.description,
      purpose: body.purpose,
      system_instructions: body.system_instructions,
      chatbot_id: body.chatbot_id,
      model: body.model || 'gemini-1.5-flash',
      temperature: body.temperature ?? 0.2,
      max_steps: body.max_steps ?? 5,
      status: body.status || 'active',
      tools: body.tools,
    });

    return NextResponse.json({ data: agent }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
