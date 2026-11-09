import * as crypto from 'crypto';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { ChatbotConfig } from '../chatbot/types';
import { ChatbotService } from '../chatbot/service';
import { getChunkStatsForChatbot } from '../knowledge/vector-store';
import {
  ChatMessage,
  ConversationRecord,
  ChatResponse,
  ChatSourceCitation,
  ChatTelemetry,
} from './types';
import { retrieveRelevantKnowledge } from './retrieval';
import { buildGroundedContext } from './context-builder';
import { buildSystemPrompt } from './prompt-builder';
import { generateLLMResponse } from './llm-service';
import { formatSourceCitations } from './source-formatter';
import { analyzeAndRewriteQuery } from './query-engine';
import { verifyAndCleanResponse } from './verifier';
import { detectAndExecuteAction } from './action-engine';
import { evaluateCostOptimization, setQueryCache } from './cost-optimizer';
import { sanitizeAndInspectMessage, wrapSecureContext } from '../security/tenant-guard';
import { recordOutcomeEvent } from '../business/outcome-tracker';

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '4000', 10);
const MAX_HISTORY_MESSAGES = parseInt(
  process.env.RAG_MAX_HISTORY_MESSAGES || '10',
  10
);

/**
 * Retrieve or create a conversation record strictly in Supabase Postgres.
 * Throws a clear Error if the database fails.
 */
export async function getOrCreateConversation(
  workspaceId: string,
  chatbotId: string,
  conversationId?: string,
  sessionId?: string
): Promise<ConversationRecord> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured. Conversation cannot be managed.');
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // If conversationId provided, verify it exists in Supabase
  if (conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('chatbot_id', chatbotId)
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error fetching conversation "${conversationId}": ${error.message}`);
    }

    if (data) {
      return data as ConversationRecord;
    }
  }

  // Create new conversation in Supabase Postgres
  const newId = conversationId || crypto.randomUUID();
  const newRecord = {
    id: newId,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    session_id: sessionId || null,
    created_at: now,
    updated_at: now,
  };

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert(newRecord)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Database error creating conversation: ${insertError.message}`);
  }

  return created as ConversationRecord;
}

/**
 * Retrieve recent messages for a conversation strictly from Supabase Postgres.
 */
export async function getConversationMessages(
  workspaceId: string,
  conversationId: string,
  limit: number = MAX_HISTORY_MESSAGES
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Database error fetching messages for conversation "${conversationId}": ${error.message}`);
  }

  return (data as ChatMessage[]) || [];
}

/**
 * Save a message to the conversation strictly in Supabase Postgres.
 */
export async function saveMessage(
  workspaceId: string,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  sources: ChatSourceCitation[] = []
): Promise<ChatMessage> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const msgId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data, error: insertError } = await supabase
    .from('messages')
    .insert({
      id: msgId,
      conversation_id: conversationId,
      role,
      content,
      sources: sources || [],
      created_at: now,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Database error saving message: ${insertError.message}`);
  }

  // Update conversation updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: now })
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId);

  return data as ChatMessage;
}

/**
 * Retrieve list of conversations for a chatbot strictly from Supabase Postgres.
 */
export async function getConversationsForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<ConversationRecord[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('chatbot_id', chatbotId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Database error fetching conversations for chatbot "${chatbotId}": ${error.message}`);
  }

  return (data as ConversationRecord[]) || [];
}

/**
 * Main chat processing method executing the RAG pipeline.
 * - Enforces database-only persistence.
 * - Blocks URL auto-fetching from chat messages.
 * - On LLM failure, returns a clean "temporarily unavailable" message.
 */
export async function processChatMessage(params: {
  workspaceId: string;
  chatbotId: string;
  userMessage: string;
  conversationId?: string;
  sessionId?: string;
}): Promise<ChatResponse> {
  const startTime = Date.now();
  const { workspaceId, chatbotId, userMessage, conversationId, sessionId } = params;

  // 1. Input validation & Security Guardrail
  const securityCheck = sanitizeAndInspectMessage(userMessage);
  if (!securityCheck.isSafe && securityCheck.blockImmediate) {
    return {
      message: 'I am here to assist you with verified business information, customer support, and bookings. Please let me know how I can help you regarding our services!',
      sources: [],
      conversation_id: conversationId || crypto.randomUUID(),
      message_id: crypto.randomUUID(),
      latency_ms: 10,
      model: 'security-guard',
    };
  }

  const cleanMessage = (securityCheck.sanitizedMessage || '').trim();
  if (!cleanMessage) {
    throw new Error('Message cannot be empty.');
  }

  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Message exceeds maximum permitted length of ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  // 2. Chatbot authorization & config retrieval strictly from DB
  const chatbot = await ChatbotService.getChatbotById(workspaceId, chatbotId);
  if (!chatbot) {
    throw new Error('Chatbot not found in this workspace.');
  }

  // 3. Resolve or create conversation strictly in DB
  const conversation = await getOrCreateConversation(
    workspaceId,
    chatbotId,
    conversationId,
    sessionId
  );

  // 4. Save incoming user message in DB
  await saveMessage(workspaceId, conversation.id, 'user', cleanMessage);

  // 5. Tier 0 / Tier 1 Cost Optimization Cache Check
  const costOpt = evaluateCostOptimization({
    workspaceId,
    chatbotId,
    cleanMessage,
    businessName: chatbot.name,
  });

  if (costOpt.isCached && costOpt.cachedResponse) {
    const savedMsg = await saveMessage(
      workspaceId,
      conversation.id,
      'assistant',
      costOpt.cachedResponse,
      []
    );
    const latency = Date.now() - startTime;
    recordOutcomeEvent({ chatbotId, isResolved: true, latencyMs: latency });
    return {
      message: costOpt.cachedResponse,
      sources: [],
      conversation_id: conversation.id,
      message_id: savedMsg.id || crypto.randomUUID(),
      latency_ms: latency,
      model: costOpt.tier,
    };
  }

  // 6. Real-Time Action & Tool Execution (Order Tracking, Bookings, Lead Capture, Escalation)
  const actionResult = await detectAndExecuteAction({
    workspaceId,
    chatbotId,
    userMessage: cleanMessage,
    industry: chatbot.industry,
    businessName: chatbot.name,
  });

  if (actionResult.hasAction && actionResult.directResponse) {
    const savedMsg = await saveMessage(
      workspaceId,
      conversation.id,
      'assistant',
      actionResult.directResponse,
      []
    );
    const latency = Date.now() - startTime;
    recordOutcomeEvent({ chatbotId, isResolved: true, latencyMs: latency });
    return {
      message: actionResult.directResponse,
      sources: [],
      conversation_id: conversation.id,
      message_id: savedMsg.id || crypto.randomUUID(),
      latency_ms: latency,
      model: `action:${actionResult.actionName || 'tool'}`,
    };
  }

  // 7. Load recent conversation history from DB
  const history = await getConversationMessages(
    workspaceId,
    conversation.id,
    MAX_HISTORY_MESSAGES
  );

  // 8. STAGE 1: Query Understanding & Conversation-Aware Rewriting
  const analyzedQuery = analyzeAndRewriteQuery({
    currentMessage: cleanMessage,
    history,
  });

  // 9. STAGE 2: Hybrid Retrieval (Lexical + Semantic) via pgvector
  const retrievalResult = await retrieveRelevantKnowledge({
    workspaceId,
    chatbotId,
    query: analyzedQuery.rewrittenQuery,
    options: {
      entities: analyzedQuery.entities,
      intent: analyzedQuery.intent,
    },
  });

  // Note: URL auto-fetching from chat messages is strictly removed to prevent SSRF vulnerabilities.
  const effectiveChunks = retrievalResult.chunks;

  // 10. STAGE 3: Build bounded, grounded context
  const ragContext = buildGroundedContext(effectiveChunks);
  const secureGroundedContext = ragContext.contextText
    ? wrapSecureContext(ragContext.contextText, chatbotId)
    : '';

  // 11. STAGE 4: Build dynamic zero-guessing system prompt
  const systemPrompt = buildSystemPrompt(chatbot, secureGroundedContext);

  // 12. STAGE 5: Generate response from LLM
  const llmResponse = await generateLLMResponse({
    systemPrompt,
    messages: history,
    contextText: secureGroundedContext,
  });

  // 13. STAGE 6: Strict Fact & Numerical Integrity Verification
  const verification = verifyAndCleanResponse({
    draftResponse: llmResponse.text,
    retrievedChunks: effectiveChunks,
    analyzedQuery,
    businessName: chatbot.name,
  });

  const finalResponseText = verification.finalResponse;

  const finalSources =
    ragContext.contextText &&
    retrievalResult.chunks.length > 0 &&
    !verification.zeroGuessTriggered
      ? ragContext.sources
      : [];

  if (!verification.zeroGuessTriggered && finalResponseText) {
    setQueryCache(chatbotId, cleanMessage, finalResponseText);
  }

  // 14. Save assistant response to DB
  const savedAssistantMsg = await saveMessage(
    workspaceId,
    conversation.id,
    'assistant',
    finalResponseText,
    finalSources
  );

  const latencyMs = Date.now() - startTime;

  recordOutcomeEvent({
    chatbotId,
    isResolved: !verification.zeroGuessTriggered,
    latencyMs,
  });

  return {
    message: finalResponseText,
    sources: finalSources,
    conversation_id: conversation.id,
    message_id: savedAssistantMsg.id || crypto.randomUUID(),
    latency_ms: latencyMs,
    model: llmResponse.model,
  };
}
