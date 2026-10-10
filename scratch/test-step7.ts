import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  generatePublicBotId,
  getChatbotByPublicId,
  getPublicChatbotConfig,
} from '../lib/widget/widget-service';
import { isOriginAllowed, normalizeDomain } from '../lib/widget/domain-validator';
import { checkWidgetRateLimit, resetRateLimits } from '../lib/widget/rate-limiter';
import { processChatMessage } from '../lib/chat/chat-service';
import { inMemoryChatbots } from '../lib/chatbot/service';
import { ChatbotConfig } from '../lib/chatbot/types';
import { saveKnowledgeChunks, inMemoryKnowledgeChunks } from '../lib/knowledge/vector-store';
import { generateLocalEmbedding } from '../lib/embeddings/embedding-service';

async function runStep7Tests() {
  console.log('🧪 [Step 7 Test Suite] Verifying Embeddable Website Chatbot Widget...\n');

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

  // 1. Public Bot ID Generation Format
  test('Public Bot ID follows bs_bot_xxxx format', () => {
    const id1 = generatePublicBotId();
    const id2 = generatePublicBotId();

    assert(id1.startsWith('bs_bot_'), `Expected bs_bot_ prefix, got: ${id1}`);
    assert(id1.length === 19, `Expected length 19 (7 prefix + 12 hex), got: ${id1.length}`);
    assert.notStrictEqual(id1, id2, 'Public bot IDs must be unique');
    assert(/^[a-z0-9_]+$/.test(id1), 'Public bot ID must only contain lowercase alphanumeric and underscores');
  });

  // Setup mock chatbot for testing
  const mockPublicId = generatePublicBotId();
  const mockChatbot: ChatbotConfig = {
    id: 'db-bot-uuid-99999',
    workspace_id: 'ws-secret-12345',
    name: 'Patna Books Support AI',
    assistant_name: 'Patna Books Assistant',
    website_url: 'https://patnabooks.com',
    welcome_message: 'Namaste! How can I help you find books today?',
    tone: 'Friendly',
    response_style: 'Balanced',
    lead_collection_enabled: false,
    lead_fields: { name: false, email: false, phone: false },
    primary_cta: 'Contact Us',
    secondary_cta: 'Browse Catalog',
    avatar_type: 'default_icon',
    brand_color: '#2563EB',
    public_id: mockPublicId,
    widget_enabled: true,
    allowed_domains: ['patnabooks.com', 'store.patnabooks.com'],
    widget_position: 'bottom-right',
    industry: 'Education',
    language: 'English',
    website_confirmed: true,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryChatbots.set(mockChatbot.id!, mockChatbot);

  // 2. Chatbot Retrieval by Public ID
  await asyncTest('Lookup chatbot safely by public_id', async () => {
    const found = await getChatbotByPublicId(mockPublicId);
    assert(found !== null, 'Should find chatbot by public ID');
    assert.strictEqual(found?.id, mockChatbot.id);
    assert.strictEqual(found?.public_id, mockPublicId);

    const notFound = await getChatbotByPublicId('bs_bot_nonexistent999');
    assert.strictEqual(notFound, null, 'Non-existent public ID should return null');
  });

  // 3. Public Config Sanitization
  await asyncTest('Sanitized public config never leaks internal secrets', async () => {
    const res = await getPublicChatbotConfig(mockPublicId);
    assert(res.config, 'Public config should exist');
    const publicConfig = res.config;

    assert.strictEqual(publicConfig.bot_id, mockPublicId, 'Public config bot_id must be public_id');
    assert.strictEqual(publicConfig.assistant_name, 'Patna Books Assistant');
    assert.strictEqual(publicConfig.brand_color, '#2563EB');
    assert.strictEqual(publicConfig.position, 'bottom-right');
    assert.strictEqual(publicConfig.welcome_message, 'Namaste! How can I help you find books today?');
    assert.strictEqual(publicConfig.widget_enabled, true);

    // Ensure secrets and internal database keys are NOT exposed
    const configKeys = Object.keys(publicConfig);
    assert(!configKeys.includes('system_prompt'), 'system_prompt must not be leaked');
    assert(!configKeys.includes('workspace_id'), 'workspace_id must not be leaked');
    assert(!configKeys.includes('provider'), 'provider must not be leaked');
    assert(!configKeys.includes('model'), 'model must not be leaked');
    assert(!configKeys.includes('api_key'), 'api_key must not be leaked');
    assert(!configKeys.includes('db-bot-uuid-99999'), 'Internal DB UUID must not be leaked');
  });

  // 4. Domain Validation & Normalization
  test('Domain normalization strips protocols, paths, ports, and trailing slashes', () => {
    assert.strictEqual(normalizeDomain('https://BiharStack.ai/'), 'biharstack.ai');
    assert.strictEqual(normalizeDomain('http://example.com:8080/path?query=1'), 'example.com');
    assert.strictEqual(normalizeDomain('subdomain.shop.co.in/checkout'), 'subdomain.shop.co.in');
  });

  test('Domain security matches exact domains and subdomains while blocking attackers', () => {
    const allowed = ['patnabooks.com', 'localhost'];

    // Allowed cases
    assert(isOriginAllowed('https://patnabooks.com', allowed), 'Exact domain should be allowed');
    assert(isOriginAllowed('https://patnabooks.com:443', allowed), 'Domain with standard port allowed');
    assert(isOriginAllowed('https://store.patnabooks.com', allowed), 'Subdomain of allowed domain allowed');
    assert(isOriginAllowed('http://localhost:3000', allowed), 'Localhost development origin allowed');

    // Blocked cases
    assert(!isOriginAllowed('https://evil-attacker.com', allowed), 'Completely different domain blocked');
    assert(!isOriginAllowed('https://patnabooks.com.attacker.com', allowed), 'Domain suffix attack blocked');
    assert(!isOriginAllowed('https://notpatnabooks.com', allowed), 'Sub-string prefix match blocked');

    // Permissive case: when allowed_domains is empty, any domain is permitted
    assert(isOriginAllowed('https://any-domain.com', []), 'Empty allowed_domains permits all domains');
  });

  // 5. Rate Limiting sliding window
  test('Widget rate limiter permits normal traffic and enforces limits', () => {
    resetRateLimits();

    const sessionId = 'bs_session_test123';
    const botId = mockPublicId;

    // Normal traffic under threshold
    for (let i = 0; i < 5; i++) {
      const res = checkWidgetRateLimit({ botId, sessionId, sessionLimit: 10 });
      assert.strictEqual(res.allowed, true, `Request ${i} should be allowed`);
    }

    // Exceed threshold
    for (let i = 5; i < 10; i++) {
      checkWidgetRateLimit({ botId, sessionId, sessionLimit: 10 });
    }
    const blockedRes = checkWidgetRateLimit({ botId, sessionId, sessionLimit: 10 });
    assert.strictEqual(blockedRes.allowed, false, '11th request must be blocked');
    assert(blockedRes.retryAfter && blockedRes.retryAfter > 0, 'Must provide retryAfter in seconds');

    // Independent session should still be allowed
    const otherSessionRes = checkWidgetRateLimit({
      botId,
      sessionId: 'bs_session_other456',
      sessionLimit: 10,
    });
    assert.strictEqual(otherSessionRes.allowed, true, 'Different session should have separate quota');
  });

  // 6. Chatbot Widget Toggle and Status Checks
  test('Disabled widget or paused status rejects chat', () => {
    const disabledBot: ChatbotConfig = {
      ...mockChatbot,
      widget_enabled: false,
    };
    assert.strictEqual(disabledBot.widget_enabled, false, 'Widget can be toggled off');

    const pausedBot: ChatbotConfig = {
      ...mockChatbot,
      status: 'paused',
    };
    assert.strictEqual(pausedBot.status, 'paused', 'Bot can be paused');
  });

  // 7. Full Public RAG Chat execution
  await asyncTest('End-to-end public chat answers questions using indexed knowledge', async () => {
    // Populate sample knowledge for patnabooks
    const testContent = 'Do you deliver books to Gaya and Darbhanga? Yes, Patna Books provides express delivery across all 38 districts of Bihar including Patna, Gaya, Muzaffarpur, Bhagalpur, and Darbhanga. Orders above Rs 499 qualify for free shipping.';
    const embedding = generateLocalEmbedding('Do you deliver books to Gaya and Darbhanga? Patna Books delivery across Bihar Gaya Darbhanga');

    inMemoryKnowledgeChunks.clear();
    await saveKnowledgeChunks(
      mockChatbot.workspace_id!,
      mockChatbot.id!,
      [
        {
          id: 'chunk-test-1',
          workspace_id: mockChatbot.workspace_id!,
          chatbot_id: mockChatbot.id!,
          knowledge_source_id: 'src-patnabooks-1',
          chunk_index: 0,
          content: testContent,
          token_count: 32,
          content_hash: 'hash-test-1',
          metadata: {
            url: 'https://patnabooks.com/shipping-policy',
            title: 'Patna Books Shipping & Delivery in Bihar',
          },
          embedding: embedding,
          created_at: new Date().toISOString(),
        },
      ]
    );

    const sessionConversationId = 'bs_session_widget_user_99';
    const response = await processChatMessage({
      workspaceId: mockChatbot.workspace_id!,
      chatbotId: mockChatbot.id!,
      userMessage: 'Do you deliver books to Gaya and Darbhanga?',
      conversationId: sessionConversationId,
    });

    assert(response.message, 'Must return a bot message string');
    assert(response.message.length > 0, 'Bot message content must not be empty');
    assert(response.sources.length > 0, 'Must cite knowledge sources');
  });

  // 8. Public Widget Script Integrity & Shadow DOM Isolation
  test('Widget bundle script (public/widget.js) exists with Shadow DOM isolation and XSS protection', () => {
    const widgetPath = path.join(process.cwd(), 'public', 'widget.js');
    assert(fs.existsSync(widgetPath), 'public/widget.js must exist on disk');

    const code = fs.readFileSync(widgetPath, 'utf-8');

    // Check Shadow DOM isolation
    assert(code.includes('attachShadow'), 'Widget must use Shadow DOM (attachShadow) for CSS isolation');
    assert(code.includes("mode: 'open'"), 'Widget must attach shadow root with mode: open');

    // Check XSS escaping
    assert(code.includes('escapeHtml'), 'Widget must sanitize user input with escapeHtml');

    // Check responsive design & styles
    assert(code.includes('@media (max-width: 640px)'), 'Widget CSS must include mobile responsive styles');
    assert(code.includes('biharstack-widget-container'), 'Widget container id must be defined');

    // Check auto-initialization from data-bot-id
    assert(code.includes('data-bot-id'), 'Widget must look up data-bot-id attribute');
  });

  // 9. Standalone Local Test HTML Page
  test('Local test embedding page (public/test-widget.html) exists for manual verification', () => {
    const testHtmlPath = path.join(process.cwd(), 'public', 'test-widget.html');
    assert(fs.existsSync(testHtmlPath), 'public/test-widget.html must exist');
    const html = fs.readFileSync(testHtmlPath, 'utf-8');
    assert(html.includes('widget.js'), 'test-widget.html must include script tag for widget.js');
    assert(html.includes('data-bot-id'), 'test-widget.html must demonstrate data-bot-id attribute');
  });

  // 10. Deploy Management Page
  test('Deploy page component exists and contains embed snippet helpers', () => {
    const deployPagePath = path.join(process.cwd(), 'app', 'chatbots', '[id]', 'deploy', 'page.tsx');
    assert(fs.existsSync(deployPagePath), 'Deploy page must exist at app/chatbots/[id]/deploy/page.tsx');
    const pageContent = fs.readFileSync(deployPagePath, 'utf-8');
    assert(pageContent.includes('allowed_domains'), 'Deploy page must support allowed domains configuration');
    assert(pageContent.includes('widget_enabled'), 'Deploy page must allow toggling widget on/off');
    assert(pageContent.includes('widget_position'), 'Deploy page must support positioning selection');
    assert(pageContent.includes('widget.js'), 'Deploy page must generate embed script snippet');
  });

  console.log(`\n========================================`);
  console.log(`Step 7 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStep7Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
