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
import { ingestExperience } from './ad-self-learning';

const MAX_MESSAGE_LENGTH = parseInt(process.env.MAX_MESSAGE_LENGTH || '4000', 10);
const MAX_HISTORY_MESSAGES = parseInt(
  process.env.RAG_MAX_HISTORY_MESSAGES || '10',
  10
);

// In-memory conversation & message store (for testing, fallback, and demo mode)
export const inMemoryConversations = new Map<string, ConversationRecord>();
export const inMemoryMessages = new Map<string, ChatMessage[]>();

// Simple in-memory rate limiting map: key -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 35; // 35 requests/minute

/**
 * Check and record rate limit for an identifier (user, workspace, or bot)
 */
export function checkRateLimit(key: string, maxRequests = MAX_REQUESTS_PER_WINDOW): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

/**
 * Retrieve or create a conversation record
 */
export async function getOrCreateConversation(
  workspaceId: string,
  chatbotId: string,
  conversationId?: string,
  sessionId?: string
): Promise<ConversationRecord> {
  const now = new Date().toISOString();

  // If conversationId provided, check if it exists
  if (conversationId) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createServerClient();
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('id', conversationId)
          .single();

        if (!error && data) {
          return data as ConversationRecord;
        }
      } catch {
        // fallback
      }
    }

    const existing = inMemoryConversations.get(conversationId);
    if (existing && existing.workspace_id === workspaceId) {
      return existing;
    }
  }

  // Create new conversation
  const newId = conversationId || crypto.randomUUID();
  const record: ConversationRecord = {
    id: newId,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    session_id: sessionId || null,
    created_at: now,
    updated_at: now,
  };

  inMemoryConversations.set(newId, record);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('conversations').insert({
        id: record.id,
        workspace_id: workspaceId,
        chatbot_id: chatbotId,
        session_id: record.session_id,
        created_at: record.created_at,
        updated_at: record.updated_at,
      });
    } catch (err: any) {
      console.warn('[ChatService] Failed to insert conversation in Supabase:', err.message);
    }
  }

  return record;
}

/**
 * Retrieve recent messages for a conversation
 */
export async function getConversationMessages(
  workspaceId: string,
  conversationId: string,
  limit: number = MAX_HISTORY_MESSAGES
): Promise<ChatMessage[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as ChatMessage[];
      }
    } catch {
      // fallback
    }
  }

  const inMem = inMemoryMessages.get(conversationId) || [];
  return inMem.slice(-limit);
}

/**
 * Save a message to the conversation
 */
export async function saveMessage(
  workspaceId: string,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  sources: ChatSourceCitation[] = []
): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    sources,
    created_at: new Date().toISOString(),
  };

  const existing = inMemoryMessages.get(conversationId) || [];
  existing.push(msg);
  inMemoryMessages.set(conversationId, existing);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      await supabase.from('messages').insert({
        id: msg.id,
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        sources: msg.sources || [],
        created_at: msg.created_at,
      });

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: msg.created_at })
        .eq('id', conversationId)
        .eq('workspace_id', workspaceId);
    } catch (err: any) {
      console.warn('[ChatService] Error saving message to Supabase:', err.message);
    }
  }

  return msg;
}

/**
 * Retrieve list of conversations for a chatbot
 */
export async function getConversationsForChatbot(
  workspaceId: string,
  chatbotId: string
): Promise<ConversationRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('chatbot_id', chatbotId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data as ConversationRecord[];
      }
    } catch {
      // fallback
    }
  }

  const all = Array.from(inMemoryConversations.values());
  return all
    .filter((c) => c.workspace_id === workspaceId && c.chatbot_id === chatbotId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

/**
 * Main chat processing method executing the RAG pipeline
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

  // 2. Rate limiting check
  const rateLimitKey = `${workspaceId}:${chatbotId}`;
  if (!checkRateLimit(rateLimitKey)) {
    throw new Error('Too many requests. Please slow down and try again shortly.');
  }

  // 3. Chatbot authorization & config retrieval
  const chatbot = await ChatbotService.getChatbotById(workspaceId, chatbotId);
  if (!chatbot) {
    throw new Error('Chatbot not found in this workspace.');
  }

  // 4. Resolve or create conversation
  const conversation = await getOrCreateConversation(
    workspaceId,
    chatbotId,
    conversationId,
    sessionId
  );

  // 5. Save incoming user message
  await saveMessage(workspaceId, conversation.id, 'user', cleanMessage);

  // 6. Tier 0 / Tier 1 Cost Optimization Cache Check ($0 cost, 1ms latency)
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

  // 7. Real-Time Action & Tool Execution (Order Tracking, Bookings, Lead Capture, Escalation)
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

  // 8. Load recent conversation history for multi-turn dialogue & pronoun resolution
  const history = await getConversationMessages(
    workspaceId,
    conversation.id,
    MAX_HISTORY_MESSAGES
  );

  // 9. STAGE 1: Query Understanding & Conversation-Aware Rewriting
  const analyzedQuery = analyzeAndRewriteQuery({
    currentMessage: cleanMessage,
    history,
  });

  // 10. STAGE 2: Hybrid Retrieval (Lexical + Semantic) & Entity Re-ranking
  const retrievalResult = await retrieveRelevantKnowledge({
    workspaceId,
    chatbotId,
    query: analyzedQuery.rewrittenQuery,
    options: {
      entities: analyzedQuery.entities,
      intent: analyzedQuery.intent,
    },
  });

  // 10.5 Real-Time Web Link Intelligence: Live URL extraction & Auto-Brain Expansion
  const urlMatch = cleanMessage.match(/https?:\/\/[^\s"'<>]+/i);
  let liveUrlChunk: any = null;
  if (urlMatch) {
    try {
      const rawFoundUrl = urlMatch[0];
      const { fetchAndExtractPage } = await import('@/lib/crawler/native-crawler');
      const pageData = await fetchAndExtractPage(rawFoundUrl);
      if (pageData && pageData.status === 'completed' && pageData.content) {
        liveUrlChunk = {
          id: 'live-' + Math.random().toString(36).substring(2, 8),
          content: `[Live Page Content from ${pageData.url}]\n${pageData.content.slice(0, 4500)}`,
          similarity: 1.0,
          url: pageData.url,
          title: pageData.title || 'Live Web Link',
          heading: 'Live Web Page Content',
          token_count: Math.ceil(pageData.content.length / 4),
          metadata: {
            url: pageData.url,
            title: pageData.title,
          },
        };
        // Asynchronously persist and vectorize to bot's permanent brain memory
        import('@/lib/crawler/runner').then(async ({ addOrUpdateKnowledgeSource }) => {
          const { processKnowledgeSource } = await import('@/lib/knowledge/processor');
          const newSource = {
            id: 'src-live-' + Math.random().toString(36).substring(2, 9),
            workspace_id: workspaceId,
            chatbot_id: chatbotId,
            source_type: 'website' as const,
            url: pageData.url,
            title: pageData.title || 'Live Crawled Web Link',
            content: pageData.content,
            content_hash: pageData.content_hash,
            status: 'completed' as const,
            word_count: pageData.word_count,
            crawled_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await addOrUpdateKnowledgeSource(workspaceId, chatbotId, newSource);
          await processKnowledgeSource(workspaceId, chatbotId, newSource);
        }).catch((err) => console.warn('[Live URL] Auto-save background error:', err));
      }
    } catch (err: any) {
      console.warn('[Live URL] Could not fetch URL from user message:', err.message);
    }
  }

  const effectiveChunks = liveUrlChunk
    ? [liveUrlChunk, ...retrievalResult.chunks]
    : retrievalResult.chunks;

  // 11. STAGE 3: Build bounded, grounded context with cryptographic secure delimiters
  const ragContext = buildGroundedContext(effectiveChunks);
  const secureGroundedContext = ragContext.contextText
    ? wrapSecureContext(ragContext.contextText, chatbotId)
    : '';

  // 12. STAGE 4: Build dynamic zero-guessing system prompt with Industry Blueprints
  const systemPrompt = buildSystemPrompt(chatbot, secureGroundedContext);

  // 13. STAGE 5: Generate response from LLM
  const llmResponse = await generateLLMResponse({
    systemPrompt,
    messages: history,
    contextText: secureGroundedContext,
  });

  // 14. STAGE 6: Strict Fact & Numerical Integrity Verification
  const verification = verifyAndCleanResponse({
    draftResponse: llmResponse.text,
    retrievedChunks: effectiveChunks,
    analyzedQuery,
    businessName: chatbot.name,
  });

  const finalResponseText = verification.finalResponse;

  // Only include sources if relevant chunks were verified and answer is grounded
  const finalSources =
    ragContext.contextText &&
    retrievalResult.chunks.length > 0 &&
    !verification.zeroGuessTriggered
      ? ragContext.sources
      : [];

  // Cache successful grounded responses in Tier 1 Query Cache
  if (!verification.zeroGuessTriggered && finalResponseText) {
    setQueryCache(chatbotId, cleanMessage, finalResponseText);
  }

  // 15. Save verified assistant message with citations
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

  // Self-Learning Architecture: Record conversation experience for continuous autonomous model training
  try {
    ingestExperience({
      query: cleanMessage,
      response: finalResponseText,
      hasContext: effectiveChunks.length > 0,
      domain: chatbot.name,
    });
  } catch {
    // Non-blocking telemetry
  }

  // 16. Internal observability logging
  const telemetry: ChatTelemetry = {
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    conversation_id: conversation.id,
    user_query_length: cleanMessage.length,
    retrieved_chunks_count: retrievalResult.chunks.length,
    latency_ms: latencyMs,
    input_tokens: llmResponse.inputTokens,
    output_tokens: llmResponse.outputTokens,
    llm_provider: process.env.LLM_PROVIDER || 'gemini',
    llm_model: llmResponse.model,
    status: 'success',
  };
  console.log('[RAG Chat] Request completed successfully:', JSON.stringify(telemetry));

  return {
    message: finalResponseText,
    sources: finalSources,
    conversation_id: conversation.id,
    message_id: savedAssistantMsg.id || crypto.randomUUID(),
    latency_ms: latencyMs,
    model: llmResponse.model,
  };
}
