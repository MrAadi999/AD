import { NextRequest, NextResponse } from 'next/server';
import { distillConversationFacts } from '@/lib/knowledge/auto-learning';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ChatMessage } from '@/lib/chat/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId = 'default',
      chatbotId,
      conversationId,
      messages: explicitMessages,
    } = body;

    if (!chatbotId || !conversationId) {
      return NextResponse.json(
        { error: 'chatbotId and conversationId are required.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database error: Supabase is not configured.' },
        { status: 500 }
      );
    }

    let chatMessages: ChatMessage[] = explicitMessages || [];

    // Fetch messages strictly from Supabase
    if (!chatMessages.length) {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        return NextResponse.json(
          { error: `Database error fetching messages: ${error.message}` },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        chatMessages = data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        }));
      }
    }

    if (!chatMessages.length) {
      return NextResponse.json(
        { message: 'No messages found in conversation to distill.', learned: [] },
        { status: 200 }
      );
    }

    // Run AI Fact Distillation with Gemini Flash
    const learnedMemories = await distillConversationFacts({
      workspaceId,
      chatbotId,
      conversationId,
      messages: chatMessages,
    });

    return NextResponse.json({
      success: true,
      conversationId,
      totalLearned: learnedMemories.length,
      learnedMemories,
      message: `Successfully distilled ${learnedMemories.length} durable facts from conversation into vector memory.`,
    });
  } catch (err: any) {
    console.error('[AutoLearn API] Error distilling conversation:', err);
    return NextResponse.json(
      { error: err.message || 'Auto-learning distillation failed' },
      { status: 500 }
    );
  }
}
