import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ChatbotService } from '@/lib/chatbot/service';
import {
  processAllKnowledgeSourcesForChatbot,
  processKnowledgeSource,
} from '@/lib/knowledge/processor';
import { getKnowledgeSourcesForChatbot } from '@/lib/crawler/runner';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chatbotId = params.id;

  try {
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

      // Secure workspace verification
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
      }

      workspaceId = member.workspace_id;

      // Verify chatbot in workspace
      const { data: bot, error: botError } = await supabase
        .from('chatbots')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('id', chatbotId)
        .single();

      if (botError || !bot) {
        return NextResponse.json({ error: 'Chatbot not found.' }, { status: 404 });
      }
    } else {
      const chatbot = await ChatbotService.getChatbotById(workspaceId, chatbotId);
      if (!chatbot) {
        return NextResponse.json({ error: 'Chatbot not found.' }, { status: 404 });
      }
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const sourceId = body?.source_id;

    if (sourceId) {
      // Process single source
      const sources = await getKnowledgeSourcesForChatbot(workspaceId, chatbotId);
      const targetSource = sources.find((s) => s.id === sourceId);

      if (!targetSource) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }

      const result = await processKnowledgeSource(workspaceId, chatbotId, targetSource);
      return NextResponse.json({ success: true, result });
    }

    // Process all sources for chatbot
    const summary = await processAllKnowledgeSourcesForChatbot(workspaceId, chatbotId);
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    console.error('[ProcessKnowledgeRoute] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
