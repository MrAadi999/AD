import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { processChatMessage } from '@/lib/chat/chat-service';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    const chatbotId = body?.chatbot_id;
    const message = body?.message;
    const conversationId = body?.conversation_id;
    const sessionId = body?.session_id;

    // 1. Input Validation
    if (!chatbotId || typeof chatbotId !== 'string') {
      return NextResponse.json(
        { error: 'Valid chatbot_id is required.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    let workspaceId = 'ws-demo-01';

    // 2. Authentication & Workspace Verification
    if (isSupabaseConfigured()) {
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
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'Workspace not found.' },
          { status: 403 }
        );
      }

      workspaceId = member.workspace_id;
    }

    // 3. Process Chat via RAG Pipeline
    const result = await processChatMessage({
      workspaceId,
      chatbotId,
      userMessage: message,
      conversationId,
      sessionId,
    });

    return NextResponse.json({
      message: result.message,
      sources: result.sources,
      conversation_id: result.conversation_id,
      message_id: result.message_id,
      latency_ms: result.latency_ms,
    });
  } catch (err: any) {
    console.error('[ChatAPI] Error:', err);

    if (err.message && err.message.includes('exceeds maximum permitted length')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err.message && err.message.includes('Too many requests')) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err.message && err.message.includes('Chatbot not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: err.message || 'Internal server error processing chat.' },
      { status: 500 }
    );
  }
}
