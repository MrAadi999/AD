import { NextRequest, NextResponse } from 'next/server';
import { authenticateBearerKey } from '@/lib/developer/key-service';
import { AgentService } from '@/lib/agents/agent-service';
import { generateRequestId } from '@/lib/developer/request-id';
import { recordApiLog } from '@/lib/developer/usage-service';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const agentId = params.id;
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': requestId,
  };

  // 1. Resolve Workspace & Authenticate
  // Support both Bearer API Key (for external API clients) and Cookie Session (for dashboard tester)
  let workspaceId: string | null = null;
  const authHeader = req.headers.get('authorization');

  if (authHeader && authHeader.trim().toLowerCase().startsWith('bearer ')) {
    const authResult = await authenticateBearerKey(authHeader);
    if (!authResult.ok || !authResult.apiKey) {
      await recordApiLog({
        workspace_id: 'unauthenticated',
        request_id: requestId,
        method: 'POST',
        path: `/v1/agents/${agentId}/run`,
        status_code: authResult.status || 401,
        latency_ms: Date.now() - startTime,
        error_code: authResult.code,
      });

      return NextResponse.json(
        {
          error: {
            code: authResult.code || 'invalid_api_key',
            message: authResult.message || 'Unauthorized API key.',
          },
          request_id: requestId,
        },
        { status: authResult.status || 401, headers: corsHeaders }
      );
    }
    workspaceId = authResult.apiKey.workspace_id;
  } else {
    // Cookie / Dashboard Session
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
          if (member?.workspace_id) workspaceId = member.workspace_id;
        }
      } catch {
        // Fallback
      }
    }
  }

  // Fallback to query param or default demo workspace for local testing
  if (!workspaceId) {
    const url = new URL(req.url);
    workspaceId = url.searchParams.get('workspace_id') || 'ws-demo-01';
  }

  // 2. Parse request body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Request body must be valid JSON.' }, request_id: requestId },
      { status: 400, headers: corsHeaders }
    );
  }

  const { input, session_id, conversation_id } = body || {};
  const cleanInput = (input || '').trim();

  if (!cleanInput) {
    return NextResponse.json(
      { error: { code: 'empty_input', message: 'The "input" field is required.' }, request_id: requestId },
      { status: 400, headers: corsHeaders }
    );
  }

  // 3. Chatbot / Agent Ownership Security Check
  const agent = await AgentService.getAgentById(workspaceId, agentId);
  if (!agent) {
    // Check if agent belongs to another workspace (Strict multi-tenant security!)
    // If it belongs to another workspace, return 403 Forbidden!
    return NextResponse.json(
      {
        error: {
          code: 'forbidden',
          message: 'You do not have permission to execute this agent or agent not found.',
        },
        request_id: requestId,
      },
      { status: 403, headers: corsHeaders }
    );
  }

  // 4. Agent Status Check
  if (agent.status === 'paused' || agent.status === 'archived') {
    return NextResponse.json(
      {
        error: {
          code: 'agent_inactive',
          message: `This agent is currently ${agent.status} and cannot be executed.`,
        },
        request_id: requestId,
      },
      { status: 403, headers: corsHeaders }
    );
  }

  // 5. Execute Agent Run
  try {
    const response = await AgentService.executeAgentRun({
      workspaceId,
      agentId,
      userInput: cleanInput,
      sessionId: session_id,
      conversationId: conversation_id,
    });

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'agent_execution_failed',
          message: err.message || 'An error occurred during agent execution.',
        },
        request_id: requestId,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
