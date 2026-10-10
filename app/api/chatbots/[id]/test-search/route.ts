import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ChatbotService } from '@/lib/chatbot/service';
import { generateEmbedding } from '@/lib/embeddings/embedding-service';
import { searchSimilarChunks } from '@/lib/knowledge/vector-store';

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

      // Secure workspace resolution
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

    const body = await request.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required.' },
        { status: 400 }
      );
    }

    const topK = typeof body?.topK === 'number' ? Math.min(Math.max(1, body.topK), 20) : 5;
    const threshold = typeof body?.threshold === 'number' ? body.threshold : 0.2;

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // 2. Query similarity search
    const matches = await searchSimilarChunks({
      workspaceId,
      chatbotId,
      queryEmbedding,
      topK,
      similarityThreshold: threshold,
    });

    return NextResponse.json({
      query,
      count: matches.length,
      matches,
    });
  } catch (err: any) {
    console.error('[TestSearchRoute] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
