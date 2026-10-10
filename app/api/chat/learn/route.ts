import { NextRequest, NextResponse } from 'next/server';
import { distillConversationFacts } from '@/lib/knowledge/auto-learning';
import { inMemoryMessages } from '@/lib/chat/chat-service';
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

    let chatMessages: ChatMessage[] = explicitMessages || [];

    // Fetch messages from Supabase or in-memory if not provided directly
    if (!chatMessages.length) {
      if (isSupabaseConfigured()) {
        try {
          const supabase = createServerClient();
          const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (data && data.length > 0) {
            chatMessages = data.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }));
          }
        } catch {
          // fallback
        }
      }

      if (!chatMessages.length) {
        chatMessages = inMemoryMessages.get(conversationId) || [];
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
