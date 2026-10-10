import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getConversationsForChatbot,
  getConversationMessages,
} from '@/lib/chat/chat-service';

export async function GET(
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
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    const conversations = await getConversationsForChatbot(workspaceId, chatbotId);

    let messages: any[] = [];
    if (conversationId) {
      messages = await getConversationMessages(workspaceId, conversationId, 50);
    } else if (conversations.length > 0) {
      messages = await getConversationMessages(workspaceId, conversations[0].id, 50);
    }

    return NextResponse.json({
      conversations,
      messages,
      active_conversation_id: conversationId || (conversations[0]?.id ?? null),
    });
  } catch (err: any) {
    console.error('[ConversationsAPI] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
