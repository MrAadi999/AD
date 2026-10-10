import assert from 'assert';
import {
  processChatMessage,
  getOrCreateConversation,
  getConversationMessages,
  saveMessage,
  checkRateLimit,
  inMemoryConversations,
  inMemoryMessages,
} from '../lib/chat/chat-service';
import { retrieveRelevantKnowledge } from '../lib/chat/retrieval';
import { buildGroundedContext } from '../lib/chat/context-builder';
import { buildSystemPrompt } from '../lib/chat/prompt-builder';
import { formatSourceCitations } from '../lib/chat/source-formatter';
import { generateLLMResponse } from '../lib/chat/llm-service';
import {
  saveKnowledgeChunks,
  inMemoryKnowledgeChunks,
} from '../lib/knowledge/vector-store';
import { generateLocalEmbedding } from '../lib/embeddings/embedding-service';
import { inMemoryChatbots } from '../lib/chatbot/service';
import { ChatbotConfig } from '../lib/chatbot/types';

async function runStep6Tests() {
  console.log('🧪 [Step 6 Test Suite] Verifying AI Chat & RAG Engine...\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  // 1. Input Validation: Maximum Message Length
  await asyncTest('Input validation rejects empty and oversized messages', async () => {
    try {
      await processChatMessage({
        workspaceId: 'ws-test',
        chatbotId: 'bot-test',
        userMessage: '   ',
      });
      assert.fail('Should reject empty message');
    } catch (err: any) {
      assert(err.message.includes('cannot be empty'));
    }

    try {
      const hugeMsg = 'A'.repeat(4500);
      await processChatMessage({
        workspaceId: 'ws-test',
        chatbotId: 'bot-test',
        userMessage: hugeMsg,
      });
      assert.fail('Should reject message > 4000 chars');
    } catch (err: any) {
      assert(err.message.includes('exceeds maximum permitted length'));
    }
  });

  // 2. Rate Limiting Check
  test('Rate limiting permits reasonable requests and blocks excessive spikes', () => {
    const testKey = 'test-client-' + Date.now();
    for (let i = 0; i < 35; i++) {
      const allowed = checkRateLimit(testKey, 35);
      assert.strictEqual(allowed, true, `Request ${i + 1} should be allowed`);
    }
    const blocked = checkRateLimit(testKey, 35);
    assert.strictEqual(blocked, false, '36th request must be rate-limited');
  });

  // 3. Source Formatting & Deduplication
  test('Source formatter deduplicates by URL and excludes internal chunk IDs', () => {
    const rawChunks = [
      {
        id: 'chunk-123',
        content: 'Services excerpt 1',
        similarity: 0.88,
        url: 'https://biharstack.com/services',
        title: 'Our Services',
      },
      {
        id: 'chunk-456',
        content: 'Services excerpt 2',
        similarity: 0.82,
        url: 'https://biharstack.com/services',
        title: 'Our Services',
      },
      {
        id: 'chunk-789',
        content: 'About excerpt',
        similarity: 0.75,
        url: 'https://biharstack.com/about',
        title: 'About Us',
      },
    ];

    const citations = formatSourceCitations(rawChunks as any, false);
    assert.strictEqual(citations.length, 2, 'Should deduplicate identical URLs to 2 citations');
    assert.strictEqual(citations[0].title, 'Our Services');
    assert.strictEqual(citations[0].url, 'https://biharstack.com/services');
    assert.strictEqual(citations[0].chunk_id, undefined, 'Must NOT expose internal chunk ID');
  });

  // 4. Context Builder: Boundaries and Token Budgeting
  test('Context builder enforces source boundaries and token budget', () => {
    const chunks = [
      {
        id: 'c1',
        content: 'BiharStack AI offers automated customer care.',
        similarity: 0.95,
        url: 'https://biharstack.com',
        title: 'Home',
        token_count: 8,
      },
      {
        id: 'c2',
        content: 'Pricing starts at 999 INR per month with unlimited chats.',
        similarity: 0.85,
        url: 'https://biharstack.com/pricing',
        title: 'Pricing',
        token_count: 12,
      },
    ];

    const ragContext = buildGroundedContext(chunks as any, 100);
    assert(ragContext.contextText.includes('SOURCE 1'), 'Has SOURCE 1 boundary');
    assert(ragContext.contextText.includes('SOURCE 2'), 'Has SOURCE 2 boundary');
    assert(ragContext.contextText.includes('Title: Home'));
    assert(ragContext.contextText.includes('Title: Pricing'));
    assert.strictEqual(ragContext.sources.length, 2);
  });

  function createMockChatbot(overrides: Partial<ChatbotConfig> = {}): ChatbotConfig {
    return {
      id: 'bot-' + Math.random().toString(36).substring(2, 8),
      workspace_id: 'ws-demo',
      name: 'BiharStack AI',
      industry: 'Technology',
      language: 'English',
      website_url: 'https://biharstack.com',
      website_confirmed: true,
      assistant_name: 'BiharStack AI Assistant',
      welcome_message: 'Hi! How can I help you today?',
      tone: 'Professional',
      response_style: 'Balanced',
      lead_collection_enabled: true,
      lead_fields: { name: true, email: true, phone: false },
      primary_cta: 'Talk to us',
      secondary_cta: 'Contact support',
      avatar_type: 'default_icon',
      brand_color: '#2563EB',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    };
  }

  // 5. Prompt Builder: Tone, Style, Language, and Anti-Hallucination
  test('Prompt builder configures tone, style, language, and anti-hallucination rules', () => {
    const testBot = createMockChatbot({
      id: 'bot-custom',
      workspace_id: 'ws-1',
      name: 'Mithila AI',
      language: 'Hinglish',
      tone: 'Friendly',
      response_style: 'Concise',
    });

    const prompt = buildSystemPrompt(testBot, 'Mock context text');
    assert(prompt.includes('Mithila AI'), 'Includes assistant name');
    assert(prompt.includes('warm, welcoming, and helpful tone'), 'Includes friendly tone instructions');
    assert(prompt.includes('concise, direct, and brief'), 'Includes concise style instructions');
    assert(prompt.includes('conversational Hinglish'), 'Includes Hinglish language instruction');
    assert(prompt.includes('STRICT GROUNDING & ANTI-HALLUCINATION RULES'), 'Includes anti-hallucination guardrails');
    assert(prompt.includes('SECURITY & PROMPT INJECTION DEFENSE'), 'Includes prompt injection defense');
  });

  // 6. Conversation & Message Storage
  await asyncTest('Conversation and message store persists multi-turn dialogue', async () => {
    inMemoryConversations.clear();
    inMemoryMessages.clear();

    const conv = await getOrCreateConversation('ws-store', 'bot-store');
    assert(conv.id, 'Conversation has ID');

    await saveMessage('ws-store', conv.id, 'user', 'Hello AI');
    await saveMessage('ws-store', conv.id, 'assistant', 'Hello, how can I help?', [
      { title: 'Home', url: 'https://biharstack.com' },
    ]);

    const history = await getConversationMessages('ws-store', conv.id);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].role, 'user');
    assert.strictEqual(history[1].role, 'assistant');
    assert.strictEqual(history[1].sources?.length, 1);
  });

  // 7. Conversation & Tenant Isolation
  await asyncTest('Strict tenant isolation prevents cross-workspace conversation leaks', async () => {
    const convA = await getOrCreateConversation('ws-alpha', 'bot-1');
    const convB = await getOrCreateConversation('ws-beta', 'bot-2');

    await saveMessage('ws-alpha', convA.id, 'user', 'Secret Alpha message');
    await saveMessage('ws-beta', convB.id, 'user', 'Secret Beta message');

    const historyA = await getConversationMessages('ws-alpha', convA.id);
    const hasBetaLeak = historyA.some((m) => m.content.includes('Secret Beta'));
    assert(!hasBetaLeak, 'Workspace Alpha must never access Workspace Beta messages');
  });

  // 8. Empty Knowledge State Handling
  await asyncTest('Empty knowledge state returns helpful safe fallback without crashing', async () => {
    const emptyBot = createMockChatbot({
      id: 'bot-empty',
      workspace_id: 'ws-empty',
      name: 'Empty Bot',
    });
    inMemoryChatbots.set('bot-empty', emptyBot);
    inMemoryKnowledgeChunks.set('bot-empty', []);

    const res = await processChatMessage({
      workspaceId: 'ws-empty',
      chatbotId: 'bot-empty',
      userMessage: 'What do you sell?',
    });

    assert(res.message.includes("doesn't have any knowledge yet"), 'Friendly empty knowledge notification');
    assert.strictEqual(res.sources.length, 0);
  });

  // 9. End-to-End RAG Pipeline: Grounded Answer & Source Citations
  await asyncTest('End-to-end RAG returns verified services and citations from website knowledge', async () => {
    const e2eBot = createMockChatbot({
      id: 'bot-e2e',
      workspace_id: 'ws-e2e',
      name: 'BiharStack AI',
      website_url: 'https://biharstack.com',
    });
    inMemoryChatbots.set('bot-e2e', e2eBot);

    // Seed realistic knowledge base chunks
    const knowledgeChunks = [
      {
        id: 'chunk-services',
        workspace_id: 'ws-e2e',
        chatbot_id: 'bot-e2e',
        knowledge_source_id: 'src-services',
        content: `
          BiharStack AI provides three core enterprise offerings:
          1. AI Chatbots for 24/7 autonomous customer communication.
          2. AI Automation workflows connecting CRM, inventory, and WhatsApp.
          3. Custom Software engineering tailored for businesses in Bihar and India.
        `,
        chunk_index: 0,
        token_count: 45,
        content_hash: 'hash-services',
        embedding: generateLocalEmbedding('What services do you provide? AI Chatbots, AI Automation, Custom Software'),
        metadata: {
          url: 'https://biharstack.com/services',
          title: 'Services & Capabilities',
        },
        created_at: new Date().toISOString(),
      },
      {
        id: 'chunk-about',
        workspace_id: 'ws-e2e',
        chatbot_id: 'bot-e2e',
        knowledge_source_id: 'src-about',
        content: `
          BiharStack AI was founded with the mission: "Turn your website into an AI chatbot in under 2 minutes."
          Headquartered in Patna, Bihar.
        `,
        chunk_index: 0,
        token_count: 35,
        content_hash: 'hash-about',
        embedding: generateLocalEmbedding('About BiharStack mission company information'),
        metadata: {
          url: 'https://biharstack.com/about',
          title: 'About BiharStack',
        },
        created_at: new Date().toISOString(),
      },
    ];

    await saveKnowledgeChunks('ws-e2e', 'bot-e2e', knowledgeChunks);

    // Ask grounded question:
    const chatRes = await processChatMessage({
      workspaceId: 'ws-e2e',
      chatbotId: 'bot-e2e',
      userMessage: 'What services do you provide?',
    });

    console.log(`     (User Question: "What services do you provide?")`);
    console.log(`     (AI Grounded Answer: "${chatRes.message}")`);
    console.log(`     (Sources: ${chatRes.sources.map((s) => s.title).join(', ')})`);

    assert(chatRes.message.includes('AI Chatbots') || chatRes.message.includes('AI Automation') || chatRes.message.includes('Custom Software'), 'Must return services from knowledge base');
    assert(chatRes.sources.length >= 1, 'Must return at least 1 source citation');
    assert.strictEqual(chatRes.sources[0].url, 'https://biharstack.com/services');
  });

  // 10. Anti-Hallucination Test: Refuse to Invent Unavailable Information
  await asyncTest('Anti-hallucination guardrail strictly refuses to fabricate missing contact info', async () => {
    // User asks for something completely missing from the knowledge base:
    const missingRes = await processChatMessage({
      workspaceId: 'ws-e2e',
      chatbotId: 'bot-e2e',
      userMessage: 'What is your office phone number?',
    });

    console.log(`     (User Question: "What is your office phone number?")`);
    console.log(`     (AI Anti-Hallucination Answer: "${missingRes.message}")`);

    // Must NOT invent a phone number!
    assert(!/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(missingRes.message), 'Must NEVER fabricate a phone number');
    assert(!/\+?91[-.\s]?\d{10}/.test(missingRes.message), 'Must NEVER invent Indian phone number');
    assert(
      missingRes.message.toLowerCase().includes("don't have that information") ||
      missingRes.message.toLowerCase().includes("not have that information") ||
      missingRes.message.toLowerCase().includes("available business knowledge"),
      'Must state that information is not available in business knowledge'
    );
  });

  console.log(`\n========================================`);
  console.log(`🎉 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStep6Tests().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
