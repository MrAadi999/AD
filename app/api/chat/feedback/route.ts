import { NextRequest, NextResponse } from 'next/server';
import { recordFeedback } from '@/lib/knowledge/auto-learning';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId = 'default',
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

    const feedback = await recordFeedback({
      workspaceId,
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
      message:
        feedback.status === 'auto_learned'
          ? 'Thank you! Your correction was learned by the AI model in real time.'
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
