import { NextRequest, NextResponse } from 'next/server';
import {
  inMemoryLearnedMemories,
  inMemoryKnowledgeGaps,
  inMemoryFeedback,
  saveLearnedMemory,
} from '@/lib/knowledge/auto-learning';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chatbotId = searchParams.get('chatbotId');
  const workspaceId = searchParams.get('workspaceId') || 'default';

  if (!chatbotId) {
    return NextResponse.json({ error: 'chatbotId query param is required' }, { status: 400 });
  }

  let memories = inMemoryLearnedMemories.get(chatbotId) || [];
  let gaps = inMemoryKnowledgeGaps.get(chatbotId) || [];
  let feedback = inMemoryFeedback.get(chatbotId) || [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const [memRes, gapRes, feedRes] = await Promise.all([
        supabase
          .from('learned_memories')
          .select('*')
          .eq('chatbot_id', chatbotId)
          .order('created_at', { ascending: false }),
        supabase
          .from('knowledge_gaps')
          .select('*')
          .eq('chatbot_id', chatbotId)
          .order('frequency', { ascending: false }),
        supabase
          .from('interaction_feedback')
          .select('*')
          .eq('chatbot_id', chatbotId)
          .order('created_at', { ascending: false }),
      ]);

      if (memRes.data && memRes.data.length > 0) memories = memRes.data as any;
      if (gapRes.data && gapRes.data.length > 0) gaps = gapRes.data as any;
      if (feedRes.data && feedRes.data.length > 0) feedback = feedRes.data as any;
    } catch {
      // fallback to in-memory
    }
  }

  const thumbsUpCount = feedback.filter((f) => f.rating === 1).length;
  const thumbsDownCount = feedback.filter((f) => f.rating === -1).length;
  const totalFeedback = thumbsUpCount + thumbsDownCount;
  const satisfactionRate =
    totalFeedback > 0 ? Math.round((thumbsUpCount / totalFeedback) * 100) : 100;

  return NextResponse.json({
    chatbotId,
    stats: {
      totalLearnedMemories: memories.length,
      totalKnowledgeGaps: gaps.length,
      thumbsUpCount,
      thumbsDownCount,
      satisfactionRate: `${satisfactionRate}%`,
    },
    memories,
    knowledgeGaps: gaps,
    recentFeedback: feedback.slice(0, 20),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId = 'default',
      chatbotId,
      factContent,
      category = 'business_fact',
    } = body;

    if (!chatbotId || !factContent) {
      return NextResponse.json(
        { error: 'chatbotId and factContent are required' },
        { status: 400 }
      );
    }

    const saved = await saveLearnedMemory({
      workspaceId,
      chatbotId,
      factContent,
      category,
      confidenceScore: 1.0,
      sourceType: 'admin_override',
    });

    return NextResponse.json({
      success: true,
      memory: saved,
      message: 'New fact successfully injected into bot memory.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to save learned memory' },
      { status: 500 }
    );
  }
}
