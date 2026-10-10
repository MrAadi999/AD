import * as crypto from 'crypto';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { generateEmbedding } from '../embeddings/embedding-service';
import { cosineSimilarity } from './vector-store';
import { ChatMessage } from '../chat/types';

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
  rating: 1 | -1; // 1 = Thumbs up, -1 = Thumbs down
  feedback_type: 'helpful' | 'inaccurate' | 'correction' | 'missing_info' | 'hallucination';
  user_comment?: string;
  corrected_answer?: string;
  status: 'pending' | 'auto_learned' | 'reviewed' | 'dismissed';
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

// In-memory fallbacks for development, tests, or before database credentials are wired
export const inMemoryLearnedMemories = new Map<string, LearnedMemory[]>();
export const inMemoryFeedback = new Map<string, InteractionFeedback[]>();
export const inMemoryKnowledgeGaps = new Map<string, KnowledgeGap[]>();

/**
 * Save a newly learned fact into dynamic memory with 768-dim embedding
 */
export async function saveLearnedMemory(params: {
  workspaceId: string;
  chatbotId: string;
  factContent: string;
  category?: 'business_fact' | 'policy' | 'pricing_update' | 'qa_pair' | 'user_preference';
  confidenceScore?: number;
  sourceType: 'user_correction' | 'conversation_distillation' | 'feedback_auto_learned' | 'admin_override';
  sourceRef?: string;
}): Promise<LearnedMemory> {
  const {
    workspaceId,
    chatbotId,
    factContent,
    category = 'business_fact',
    confidenceScore = 0.9,
    sourceType,
    sourceRef,
  } = params;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Generate embedding for semantic search
  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(factContent);
  } catch (err: any) {
    console.warn('[AutoLearning] Failed to generate embedding for memory, using empty:', err.message);
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
    is_approved: true,
    usage_count: 0,
    created_at: now,
    updated_at: now,
  };

  // 1. Update in-memory map
  const existing = inMemoryLearnedMemories.get(chatbotId) || [];
  existing.unshift(memory);
  inMemoryLearnedMemories.set(chatbotId, existing);

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('learned_memories').insert({
        id: memory.id,
        workspace_id: memory.workspace_id,
        chatbot_id: memory.chatbot_id,
        fact_content: memory.fact_content,
        category: memory.category,
        confidence_score: memory.confidence_score,
        source_type: memory.source_type,
        source_ref: memory.source_ref,
        embedding: memory.embedding,
        is_approved: memory.is_approved,
        usage_count: memory.usage_count,
        created_at: memory.created_at,
        updated_at: memory.updated_at,
      });
    } catch (err: any) {
      console.warn('[AutoLearning] Supabase insert error for learned_memories:', err.message);
    }
  }

  return memory;
}

/**
 * Search dynamic learned memories using cosine similarity against query embedding
 */
export async function searchLearnedMemories(params: {
  workspaceId: string;
  chatbotId: string;
  queryEmbedding: number[];
  topK?: number;
  similarityThreshold?: number;
}): Promise<Array<LearnedMemory & { similarity: number }>> {
  const { workspaceId, chatbotId, queryEmbedding, topK = 3, similarityThreshold = 0.35 } = params;

  // 1. Try Supabase RPC
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase.rpc('match_learned_memories', {
        query_embedding: queryEmbedding,
        match_chatbot_id: chatbotId,
        match_count: topK,
        similarity_threshold: similarityThreshold,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          similarity: Number(d.similarity.toFixed(4)),
        }));
      }
    } catch (err: any) {
      console.warn('[AutoLearning] RPC error querying learned_memories, using fallback:', err.message);
    }
  }

  // 2. In-memory cosine search fallback
  const memories = inMemoryLearnedMemories.get(chatbotId) || [];
  const results: Array<LearnedMemory & { similarity: number }> = [];

  for (const mem of memories) {
    if (mem.workspace_id !== workspaceId || mem.chatbot_id !== chatbotId) continue;
    if (!mem.embedding || mem.embedding.length === 0) continue;

    const sim = cosineSimilarity(queryEmbedding, mem.embedding);
    if (sim >= similarityThreshold) {
      results.push({
        ...mem,
        similarity: Number(sim.toFixed(4)),
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * Record user feedback (👍 / 👎) and automatically trigger instant learning
 * if a correction is provided.
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
    status: 'pending',
    created_at: now,
  };

  // In-memory store
  const existing = inMemoryFeedback.get(chatbotId) || [];
  existing.unshift(feedback);
  inMemoryFeedback.set(chatbotId, existing);

  // Supabase store
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('interaction_feedback').insert(feedback);
    } catch (err: any) {
      console.warn('[AutoLearning] Error saving feedback to Supabase:', err.message);
    }
  }

  // INSTANT SELF-LEARNING:
  // If user provided a direct corrected answer or an explanatory correction,
  // immediately distill and inject it into dynamic memory!
  const factToLearn = (correctedAnswer || '').trim() || (userComment && rating === -1 ? userComment.trim() : '');
  if (factToLearn.length > 5) {
    try {
      await saveLearnedMemory({
        workspaceId,
        chatbotId,
        factContent: factToLearn,
        category: 'business_fact',
        confidenceScore: 0.95, // High confidence for explicit human correction
        sourceType: 'user_correction',
        sourceRef: messageId || conversationId,
      });
      feedback.status = 'auto_learned';
    } catch (err: any) {
      console.warn('[AutoLearning] Auto-learn from correction failed:', err.message);
    }
  }

  return feedback;
}

/**
 * Record a detected knowledge gap (when queries fail or return low similarity)
 */
export async function recordKnowledgeGap(params: {
  workspaceId: string;
  chatbotId: string;
  queryText: string;
  suggestedAnswer?: string;
}): Promise<KnowledgeGap> {
  const { workspaceId, chatbotId, queryText, suggestedAnswer } = params;
  const cleanQuery = queryText.trim();
  if (!cleanQuery) throw new Error('Query text required');

  const now = new Date().toISOString();
  const gaps = inMemoryKnowledgeGaps.get(chatbotId) || [];
  const existing = gaps.find((g) => g.query_text.toLowerCase() === cleanQuery.toLowerCase());

  if (existing) {
    existing.frequency += 1;
    existing.updated_at = now;
    if (suggestedAnswer && !existing.suggested_answer) {
      existing.suggested_answer = suggestedAnswer;
    }
    return existing;
  }

  const newGap: KnowledgeGap = {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    query_text: cleanQuery,
    frequency: 1,
    status: 'detected',
    suggested_answer: suggestedAnswer,
    created_at: now,
    updated_at: now,
  };

  gaps.unshift(newGap);
  inMemoryKnowledgeGaps.set(chatbotId, gaps);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('knowledge_gaps').insert(newGap);
    } catch (err: any) {
      console.warn('[AutoLearning] Error saving knowledge gap:', err.message);
    }
  }

  return newGap;
}

/**
 * ChatGPT-Style Conversation Distillation Engine:
 * Analyzes a completed conversation exchange to extract durable facts and knowledge updates.
 * Powered by Gemini 1.5 Flash.
 */
export async function distillConversationFacts(params: {
  workspaceId: string;
  chatbotId: string;
  conversationId: string;
  messages: ChatMessage[];
  apiKey?: string;
}): Promise<LearnedMemory[]> {
  const { workspaceId, chatbotId, conversationId, messages, apiKey = process.env.GEMINI_API_KEY } = params;

  if (!messages || messages.length < 2) {
    return [];
  }

  // Format transcript for distillation
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `You are BiharStack's Autonomous Knowledge Distiller.
Analyze the following conversation between a user and an AI chatbot.
Your task is to identify any NEW durable business facts, corrections, policy clarifications, contact info, or question-answer rules mentioned by the user or confirmed in the chat.

Do NOT extract pleasantries, greetings, or temporary conversational states.
Only extract actionable, permanent or semi-permanent business facts or Q&A facts that will make the chatbot smarter for future users.

Return your response strictly as a JSON array of objects with the format:
[
  {
    "fact": "Clear, standalone statement of the learned fact or Q&A pair",
    "category": "business_fact" | "policy" | "pricing_update" | "qa_pair"
  }
]
If there are no new business facts or corrections to learn, return: []

CONVERSATION TRANSCRIPT:
${transcript}`;

  const distilledMemories: LearnedMemory[] = [];

  try {
    if (apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const rawJsonText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const parsed = JSON.parse(rawJsonText);

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.fact && typeof item.fact === 'string' && item.fact.length > 5) {
              const saved = await saveLearnedMemory({
                workspaceId,
                chatbotId,
                factContent: item.fact,
                category: item.category || 'business_fact',
                confidenceScore: 0.88,
                sourceType: 'conversation_distillation',
                sourceRef: conversationId,
              });
              distilledMemories.push(saved);
            }
          }
        }
      }
    } else {
      // Deterministic heuristic extractor when API key is pending
      for (const msg of messages) {
        if (msg.role === 'user' && /(actually|hamari policy|correction|update|nayi price|new timing|contact us at)/i.test(msg.content)) {
          const saved = await saveLearnedMemory({
            workspaceId,
            chatbotId,
            factContent: msg.content,
            category: 'business_fact',
            confidenceScore: 0.8,
            sourceType: 'conversation_distillation',
            sourceRef: conversationId,
          });
          distilledMemories.push(saved);
        }
      }
    }
  } catch (err: any) {
    console.error('[AutoLearning] Fact distillation error:', err.message);
  }

  return distilledMemories;
}
