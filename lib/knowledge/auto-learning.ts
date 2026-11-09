import * as crypto from 'crypto';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { generateEmbedding } from '../embeddings/embedding-service';

export interface LearnedMemory {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  fact_content: string;
  category: 'business_fact' | 'policy' | 'pricing_update' | 'qa_pair' | 'user_preference';
  confidence_score: number;
  source_type: 'user_correction' | 'conversation_distillation' | 'feedback_auto_learned' | 'admin_override';
  source_ref?: string;
  embedding?: number[];
  is_approved: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface InteractionFeedback {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  conversation_id?: string;
  message_id?: string;
  rating: 1 | -1;
  feedback_type: 'helpful' | 'inaccurate' | 'correction' | 'missing_info' | 'hallucination';
  user_comment?: string;
  corrected_answer?: string;
  status: 'pending' | 'reviewed' | 'approved' | 'dismissed';
  created_at: string;
}

export interface KnowledgeGap {
  id: string;
  workspace_id: string;
  chatbot_id: string;
  query_text: string;
  frequency: number;
  status: 'detected' | 'resolved' | 'ignored';
  suggested_answer?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save a newly learned fact into dynamic memory with 768-dim embedding.
 * Corrections must ALWAYS be saved with is_approved = false until verified by the bot owner.
 */
export async function saveLearnedMemory(params: {
  workspaceId: string;
  chatbotId: string;
  factContent: string;
  category?: 'business_fact' | 'policy' | 'pricing_update' | 'qa_pair' | 'user_preference';
  confidenceScore?: number;
  sourceType: 'user_correction' | 'conversation_distillation' | 'feedback_auto_learned' | 'admin_override';
  sourceRef?: string;
  isApproved?: boolean;
}): Promise<LearnedMemory> {
  const {
    workspaceId,
    chatbotId,
    factContent,
    category = 'business_fact',
    confidenceScore = 0.9,
    sourceType,
    sourceRef,
    isApproved = false, // Defaults strictly to false: must go to review queue
  } = params;

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured. Cannot save learned memory.');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(factContent);
  } catch (err: any) {
    console.warn('[AutoLearning] Failed to generate embedding for memory:', err.message);
  }

  const memory: LearnedMemory = {
    id,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    fact_content: factContent.trim(),
    category,
    confidence_score: confidenceScore,
    source_type: sourceType,
    source_ref: sourceRef,
    embedding,
    is_approved: isApproved,
    usage_count: 0,
    created_at: now,
    updated_at: now,
  };

  const supabase = createServerClient();
  const { data, error } = await supabase.from('learned_memories').insert({
    id: memory.id,
    workspace_id: memory.workspace_id,
    chatbot_id: memory.chatbot_id,
    fact_content: memory.fact_content,
    category: memory.category,
    confidence_score: memory.confidence_score,
    source_type: memory.source_type,
    source_ref: memory.source_ref,
    embedding: memory.embedding || null,
    is_approved: memory.is_approved,
    usage_count: memory.usage_count,
    created_at: memory.created_at,
    updated_at: memory.updated_at,
  }).select().single();

  if (error) {
    throw new Error(`Database error saving learned memory: ${error.message}`);
  }

  return (data as LearnedMemory) || memory;
}

/**
 * Record user feedback and route any corrections to the review queue with is_approved = false.
 */
export async function recordFeedback(params: {
  workspaceId: string;
  chatbotId: string;
  conversationId?: string;
  messageId?: string;
  rating: 1 | -1;
  feedbackType?: 'helpful' | 'inaccurate' | 'correction' | 'missing_info' | 'hallucination';
  userComment?: string;
  correctedAnswer?: string;
}): Promise<InteractionFeedback> {
  const {
    workspaceId,
    chatbotId,
    conversationId,
    messageId,
    rating,
    feedbackType = rating === 1 ? 'helpful' : 'inaccurate',
    userComment,
    correctedAnswer,
  } = params;

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const feedback: InteractionFeedback = {
    id,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    conversation_id: conversationId,
    message_id: messageId,
    rating,
    feedback_type: feedbackType,
    user_comment: userComment,
    corrected_answer: correctedAnswer,
    status: 'pending', // Strictly pending in review queue
    created_at: now,
  };

  const supabase = createServerClient();
  const { error } = await supabase.from('interaction_feedback').insert(feedback);
  if (error) {
    throw new Error(`Database error saving feedback: ${error.message}`);
  }

  // If a correction is submitted, route to learned_memories review queue with is_approved = false
  const factToLearn = (correctedAnswer || '').trim() || (userComment && rating === -1 ? userComment.trim() : '');
  if (factToLearn.length > 5) {
    await saveLearnedMemory({
      workspaceId,
      chatbotId,
      factContent: factToLearn,
      category: 'business_fact',
      confidenceScore: 0.95,
      sourceType: 'user_correction',
      sourceRef: messageId || conversationId,
      isApproved: false, // REVIEW QUEUE: Requires bot owner approval
    });
  }

  return feedback;
}

/**
 * Bot owner approves a correction from the review queue
 */
export async function approveCorrection(
  workspaceId: string,
  memoryId: string
): Promise<LearnedMemory> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('learned_memories')
    .update({
      is_approved: true,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', memoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Database error approving correction "${memoryId}": ${error.message}`);
  }

  return data as LearnedMemory;
}
