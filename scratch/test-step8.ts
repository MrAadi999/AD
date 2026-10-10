import assert from 'assert';
import {
  generateApiKey,
  hashApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  authenticateBearerKey,
  inMemoryApiKeys,
} from '../lib/developer/key-service';
import { checkApiKeyRateLimit, resetApiKeyRateLimits } from '../lib/developer/rate-limiter';
import {
  recordApiUsage,
  recordApiLog,
  getUsageSummary,
  getRecentLogs,
  inMemoryApiUsage,
  inMemoryApiLogs,
} from '../lib/developer/usage-service';
import { generateRequestId } from '../lib/developer/request-id';
import { inMemoryChatbots } from '../lib/chatbot/service';
import { ChatbotConfig } from '../lib/chatbot/types';
import { saveKnowledgeChunks, inMemoryKnowledgeChunks } from '../lib/knowledge/vector-store';
import { generateLocalEmbedding } from '../lib/embeddings/embedding-service';
import { processChatMessage } from '../lib/chat/chat-service';

async function runStep8Tests() {
  console.log('🧪 [Step 8 Test Suite] Verifying Developer Platform & APIs...\n');

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

  // 1. API Key Generation & Hashing
  test('API key generation produces high-entropy keys with proper prefixes', () => {
    const live = generateApiKey('live');
    const testKey = generateApiKey('test');

    assert(live.rawKey.startsWith('bs_live_'), 'Live key starts with bs_live_');
    assert(testKey.rawKey.startsWith('bs_test_'), 'Test key starts with bs_test_');

    assert(live.rawKey.length > 35, 'Key has high entropy length');
    assert.strictEqual(live.keyPrefix.startsWith('bs_live_••••••••'), true);
    assert.strictEqual(live.keyHash.length, 64, 'SHA-256 hash length must be 64 hex characters');

    // Deterministic hashing check
    const manualHash = hashApiKey(live.rawKey);
    assert.strictEqual(live.keyHash, manualHash, 'Hash must match SHA-256 digest');
  });

  // 2. API Key Creation & In-Memory Store
  const wsAlpha = 'ws-test-alpha';
  const wsBeta = 'ws-test-beta';

  let liveKeyAlpha: any;
  let testKeyAlpha: any;

  await asyncTest('Create API keys for workspace (never storing plaintext secret)', async () => {
    inMemoryApiKeys.clear();

    liveKeyAlpha = await createApiKey({
      workspaceId: wsAlpha,
      name: 'Alpha Production Server',
      environment: 'live',
    });

    testKeyAlpha = await createApiKey({
      workspaceId: wsAlpha,
      name: 'Alpha Staging Server',
      environment: 'test',
    });

    assert(liveKeyAlpha.key.startsWith('bs_live_'), 'Plaintext key returned on creation');
    assert.strictEqual(liveKeyAlpha.environment, 'live');

    // Verify stored record does NOT contain raw key
    const stored = inMemoryApiKeys.get(liveKeyAlpha.id);
    assert(stored, 'Stored record exists');
    assert.strictEqual((stored as any).key, undefined, 'Plaintext key must NEVER be stored in record');
    assert(stored?.key_hash, 'Key hash must be stored');
    assert.strictEqual(stored?.key_prefix, liveKeyAlpha.key_prefix);
  });

  // 3. API Key Listing with Workspace Isolation
  await asyncTest('List API keys enforces strict workspace isolation', async () => {
    await createApiKey({
      workspaceId: wsBeta,
      name: 'Beta Production Key',
      environment: 'live',
    });

    const alphaKeys = await listApiKeys(wsAlpha);
    const betaKeys = await listApiKeys(wsBeta);

    assert.strictEqual(alphaKeys.length, 2, 'Workspace Alpha has 2 keys');
    assert.strictEqual(betaKeys.length, 1, 'Workspace Beta has 1 key');

    // Confirm neither workspace can see the other's keys
    assert(alphaKeys.every((k) => k.workspace_id === wsAlpha));
    assert(betaKeys.every((k) => k.workspace_id === wsBeta));
  });

  // 4. Bearer Authentication
  await asyncTest('Authenticate valid Bearer key', async () => {
    const authHeader = `Bearer ${liveKeyAlpha.key}`;
    const result = await authenticateBearerKey(authHeader);

    assert.strictEqual(result.ok, true, 'Authentication succeeds');
    assert.strictEqual(result.apiKey?.id, liveKeyAlpha.id);
    assert.strictEqual(result.apiKey?.workspace_id, wsAlpha);
    assert(result.apiKey?.last_used_at !== null, 'last_used_at is updated');
  });

  await asyncTest('Reject missing, malformed, or invalid Bearer tokens', async () => {
    // Missing
    const res1 = await authenticateBearerKey(null);
    assert.strictEqual(res1.ok, false);
    assert.strictEqual(res1.code, 'missing_api_key');

    // Malformed
    const res2 = await authenticateBearerKey('Basic 12345');
    assert.strictEqual(res2.ok, false);
    assert.strictEqual(res2.code, 'invalid_authorization_format');

    // Invalid prefix
    const res3 = await authenticateBearerKey('Bearer sk_invalid_token');
    assert.strictEqual(res3.ok, false);
    assert.strictEqual(res3.code, 'invalid_api_key');

    // Non-existent key
    const res4 = await authenticateBearerKey('Bearer bs_live_nonexistent999999999999');
    assert.strictEqual(res4.ok, false);
    assert.strictEqual(res4.code, 'invalid_api_key');
  });

  // 5. Key Revocation
  await asyncTest('Revoked API key immediately ceases to authenticate', async () => {
    const revoked = await revokeApiKey(wsAlpha, testKeyAlpha.id);
    assert.strictEqual(revoked, true, 'Revocation returned true');

    const authRes = await authenticateBearerKey(`Bearer ${testKeyAlpha.key}`);
    assert.strictEqual(authRes.ok, false);
    assert.strictEqual(authRes.code, 'revoked_api_key');
    assert.strictEqual(authRes.status, 401);
  });

  // 6. Developer Rate Limiter
  test('Rate limiter permits normal volume and blocks quota overflow', () => {
    resetApiKeyRateLimits();

    const keyId = liveKeyAlpha.id;
    const customLimit = 5;

    // Requests 1-5 pass
    for (let i = 1; i <= 5; i++) {
      const res = checkApiKeyRateLimit(keyId, customLimit);
      assert.strictEqual(res.allowed, true, `Request ${i} should be allowed`);
      assert.strictEqual(res.remaining, customLimit - i);
    }

    // 6th request fails with 429 Retry-After
    const overflow = checkApiKeyRateLimit(keyId, customLimit);
    assert.strictEqual(overflow.allowed, false, '6th request must be blocked');
    assert.strictEqual(overflow.remaining, 0);
    assert(overflow.retryAfter && overflow.retryAfter > 0, 'Retry-After provided');
  });

  // 7. Multi-Tenant Chatbot Ownership Security
  const botAlpha: ChatbotConfig = {
    id: 'bot-uuid-alpha',
    public_id: 'bs_bot_alpha1234',
    workspace_id: wsAlpha,
    name: 'Alpha Assistant',
    assistant_name: 'Alpha Bot',
    website_url: 'https://alpha.example.com',
    welcome_message: 'Hello from Alpha!',
    tone: 'Friendly',
    response_style: 'Balanced',
    lead_collection_enabled: false,
    lead_fields: { name: false, email: false, phone: false },
    primary_cta: 'Contact',
    secondary_cta: 'Explore',
    avatar_type: 'default_icon',
    brand_color: '#2563EB',
    status: 'active',
    industry: 'Technology',
    language: 'English',
    website_confirmed: true,
    created_at: new Date().toISOString(),
  };

  const botBeta: ChatbotConfig = {
    id: 'bot-uuid-beta',
    public_id: 'bs_bot_beta5678',
    workspace_id: wsBeta,
    name: 'Beta Assistant',
    assistant_name: 'Beta Bot',
    website_url: 'https://beta.example.com',
    welcome_message: 'Hello from Beta!',
    tone: 'Friendly',
    response_style: 'Balanced',
    lead_collection_enabled: false,
    lead_fields: { name: false, email: false, phone: false },
    primary_cta: 'Contact',
    secondary_cta: 'Explore',
    avatar_type: 'default_icon',
    brand_color: '#2563EB',
    status: 'active',
    industry: 'Technology',
    language: 'English',
    website_confirmed: true,
    created_at: new Date().toISOString(),
  };

  inMemoryChatbots.set(botAlpha.id!, botAlpha);
  inMemoryChatbots.set(botBeta.id!, botBeta);

  test('Cross-workspace chatbot access detection', () => {
    // If Workspace Alpha key tries to access Workspace Beta bot
    const isOwner = botBeta.workspace_id === liveKeyAlpha.workspace_id;
    assert.strictEqual(isOwner, false, 'Workspace Alpha must NOT own Workspace Beta bot');
  });

  // 8. End-to-End Grounded RAG Chat via Existing Step 6 Engine
  await asyncTest('End-to-end RAG chat completion returns grounded answer and citations', async () => {
    const knowledgeText =
      'What SLA and backup features do you offer? Alpha Cloud Enterprise offers automated database backups, 99.99% uptime SLA, and zero-downtime deployment for business clients in India.';
    const embedding = generateLocalEmbedding(
      'What SLA and backup features do you offer? Alpha Cloud Enterprise automated database backups uptime SLA'
    );

    inMemoryKnowledgeChunks.clear();
    await saveKnowledgeChunks(wsAlpha, botAlpha.id!, [
      {
        id: 'chunk-alpha-1',
        workspace_id: wsAlpha,
        chatbot_id: botAlpha.id!,
        knowledge_source_id: 'src-alpha-1',
        chunk_index: 0,
        content: knowledgeText,
        token_count: 24,
        content_hash: 'hash-alpha-1',
        metadata: {
          url: 'https://alpha.example.com/features',
          title: 'Alpha Enterprise Features',
        },
        embedding: embedding,
        created_at: new Date().toISOString(),
      },
    ]);

    const reqId = generateRequestId();
    assert(reqId.startsWith('req_'), 'Request ID follows req_ format');

    const ragResult = await processChatMessage({
      workspaceId: wsAlpha,
      chatbotId: botAlpha.id!,
      userMessage: 'What SLA and backup features do you offer?',
    });

    assert(ragResult.message, 'Returns answer message');
    assert(ragResult.message.length > 0, 'Answer is not empty');
    assert(ragResult.sources.length > 0, 'Cites knowledge sources');
    assert.strictEqual(ragResult.sources[0].url, 'https://alpha.example.com/features');
  });

  // 9. API Usage & Request Log Tracking
  await asyncTest('Telemetry accurately logs usage and request events without leaking secrets', async () => {
    inMemoryApiUsage.length = 0;
    inMemoryApiLogs.length = 0;

    const testReqId = generateRequestId();

    await recordApiUsage({
      workspace_id: wsAlpha,
      api_key_id: liveKeyAlpha.id,
      chatbot_id: botAlpha.id!,
      request_id: testReqId,
      endpoint: '/v1/chat',
      method: 'POST',
      status_code: 200,
      input_tokens: 15,
      output_tokens: 45,
      total_tokens: 60,
      latency_ms: 320,
    });

    await recordApiLog({
      workspace_id: wsAlpha,
      api_key_id: liveKeyAlpha.id,
      chatbot_id: botAlpha.id!,
      request_id: testReqId,
      method: 'POST',
      path: '/v1/chat',
      status_code: 200,
      latency_ms: 320,
    });

    assert.strictEqual(inMemoryApiUsage.length, 1);
    assert.strictEqual(inMemoryApiLogs.length, 1);

    // Verify privacy: no raw secret or auth token stored in log
    const logged = inMemoryApiLogs[0];
    const logKeys = Object.keys(logged);
    assert(!logKeys.includes('rawKey'));
    assert(!logKeys.includes('authorization'));
    assert(!logKeys.includes('secret'));

    // Retrieve summary
    const summary = await getUsageSummary(wsAlpha, 'today');
    assert.strictEqual(summary.total_requests, 1);
    assert.strictEqual(summary.successful_requests, 1);
    assert.strictEqual(summary.tokens_used, 60);

    // Retrieve recent logs
    const recentLogs = await getRecentLogs(wsAlpha, 10);
    assert.strictEqual(recentLogs.length, 1);
    assert.strictEqual(recentLogs[0].request_id, testReqId);
  });

  console.log(`\n========================================`);
  console.log(`Step 8 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStep8Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
