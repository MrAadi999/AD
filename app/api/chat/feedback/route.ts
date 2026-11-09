import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { recordFeedback, approveCorrection } from '@/lib/knowledge/auto-learning';

/**
 * POST /api/chat/feedback
 * Requires authentication. Corrections are routed to a review queue with is_approved = false.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase database is not configured.' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 1. Require Authentication
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication is required to submit feedback or corrections.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      chatbotId,
      conversationId,
      messageId,
      rating,
      feedbackType,
      userComment,
      correctedAnswer,
    } = body;

    if (!chatbotId || !rating) {
      return NextResponse.json(
        { error: 'chatbotId and rating (+1 or -1) are required.' },
        { status: 400 }
      );
    }

    // 2. Resolve authenticated user's workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Forbidden: No active workspace found for user.' },
        { status: 403 }
      );
    }

    // 3. Verify chatbot belongs to the workspace
    const { data: bot, error: botError } = await supabase
      .from('chatbots')
      .select('id, workspace_id')
      .eq('id', chatbotId)
      .eq('workspace_id', member.workspace_id)
      .maybeSingle();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Chatbot not found in your workspace.' },
        { status: 404 }
      );
    }

    // 4. Record feedback with is_approved = false in review queue
    const feedback = await recordFeedback({
      workspaceId: member.workspace_id,
      chatbotId,
      conversationId,
      messageId,
      rating: rating === 1 ? 1 : -1,
      feedbackType,
      userComment,
      correctedAnswer,
    });

    return NextResponse.json({
      success: true,
      feedback,
      message: correctedAnswer
        ? 'Thank you! Your correction has been added to the review queue. The bot owner must approve it before it becomes active.'
        : 'Thank you for your feedback!',
    });
  } catch (err: any) {
    console.error('[Feedback API] Error processing feedback:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/feedback
 * Only the bot owner / workspace admin can approve corrections from the review queue.
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase database is not configured.' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { memoryId, chatbotId } = body;

    if (!memoryId || !chatbotId) {
      return NextResponse.json(
        { error: 'memoryId and chatbotId are required.' },
        { status: 400 }
      );
    }

    // Verify user is an owner or admin of the chatbot's workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: bot, error: botError } = await supabase
      .from('chatbots')
      .select('id, workspace_id')
      .eq('id', chatbotId)
      .eq('workspace_id', member.workspace_id)
      .maybeSingle();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Chatbot not found in your workspace.' }, { status: 404 });
    }

    const approvedMemory = await approveCorrection(member.workspace_id, memoryId);

    return NextResponse.json({
      success: true,
      memory: approvedMemory,
      message: 'Correction approved successfully and activated in knowledge base.',
    });
  } catch (err: any) {
    console.error('[Feedback API] Error approving correction:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to approve correction' },
      { status: 500 }
    );
  }
}
