import assert from 'assert';
import {
  analyzeAndRewriteQuery,
  extractEntitiesFromText,
  detectQueryIntent,
} from '../lib/chat/query-engine';
import {
  evaluateEvidenceStrength,
  verifyAndCleanResponse,
  generateZeroGuessFallback,
} from '../lib/chat/verifier';
import { retrieveRelevantKnowledge } from '../lib/chat/retrieval';
import {
  saveKnowledgeChunks,
  inMemoryKnowledgeChunks,
} from '../lib/knowledge/vector-store';
import { generateLocalEmbedding } from '../lib/embeddings/embedding-service';
import { ChatMessage, RetrievedChunk } from '../lib/chat/types';
import { inMemoryChatbots } from '../lib/chatbot/service';
import { processChatMessage } from '../lib/chat/chat-service';

async function runGroundingBenchmark() {
  console.log('================================================================');
  console.log('🧪 BIHARSTACK AI: FACTUAL GROUNDING & ACCURACY BENCHMARK SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    })();
  }

  // --------------------------------------------------------------------------
  // TEST 1: Query Intent Detection across Multilingual & Colloquial Phrasings
  // --------------------------------------------------------------------------
  await runTest('Intent Detection: Correctly resolves English, Hindi & Hinglish queries', () => {
    const q1 = detectQueryIntent('What is your return policy?');
    assert.strictEqual(q1.intent, 'RETURN_OR_REFUND');

    const q2 = detectQueryIntent('bhai iska return kitne din me ho jayega?');
    assert.strictEqual(q2.intent, 'RETURN_OR_REFUND');

    const q3 = detectQueryIntent('Bhai return ka kya scene hai?');
    assert.strictEqual(q3.intent, 'RETURN_OR_REFUND');

    const q4 = detectQueryIntent('What is the price of the Pro Plan?');
    assert.strictEqual(q4.intent, 'PRICING');

    const q5 = detectQueryIntent('kitne ka padega ye course?');
    assert.strictEqual(q5.intent, 'PRICING');

    const q6 = detectQueryIntent('Where is my order? Track order #98234');
    assert.strictEqual(q6.intent, 'ACTION_REQUEST');
    assert.strictEqual(q6.requiresRealtimeAction, true);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Entity Extraction for Products, Models, and Numerical Figures
  // --------------------------------------------------------------------------
  await runTest('Entity Extraction: Extracts exact models (Galaxy A36, 9W, ₹1499)', () => {
    const entities1 = extractEntitiesFromText('Tell me about the Galaxy A36 phone priced at ₹1,499');
    assert.ok(entities1.some((e) => e.includes('Galaxy A36') || e.includes('A36')));
    assert.ok(entities1.some((e) => e.includes('1,499') || e.includes('₹1,499')));

    const entities2 = extractEntitiesFromText('Show me the 9W LED bulb specification');
    assert.ok(entities2.some((e) => e.includes('9W')));
  });

  // --------------------------------------------------------------------------
  // TEST 3: Context-Aware Follow-Up Query Rewriting (Pronouns & Ellipsis)
  // --------------------------------------------------------------------------
  await runTest('Conversation-Aware Query Rewriting: Resolves "its price?" using antecedent turn', () => {
    const history: ChatMessage[] = [
      { role: 'user', content: 'Show me the XYZ Laptop details.' },
      { role: 'assistant', content: 'Here is the XYZ Laptop with 16GB RAM.' },
    ];

    const analyzed = analyzeAndRewriteQuery({
      currentMessage: 'What about its price?',
      history,
    });

    assert.strictEqual(analyzed.isFollowUp, true);
    assert.ok(
      analyzed.rewrittenQuery.toLowerCase().includes('xyz laptop'),
      `Expected rewritten query to contain 'xyz laptop', got: "${analyzed.rewrittenQuery}"`
    );
    assert.strictEqual(analyzed.intent, 'PRICING');
  });

  // --------------------------------------------------------------------------
  // TEST 4: Hybrid Search & Exact Entity Re-ranking
  // --------------------------------------------------------------------------
  await runTest('Hybrid Re-ranking: Chunks with exact entity match are ranked #1', async () => {
    const testBotId = 'bot-benchmark-01';
    const testWsId = 'ws-benchmark';

    const embeddingGeneral = generateLocalEmbedding('Overview of smartphones and budget devices');
    const embeddingSpecific = generateLocalEmbedding('Samsung Galaxy A36 has AMOLED display and costs ₹14,999');

    // Save two chunks: general vs specific
    await saveKnowledgeChunks(testWsId, testBotId, [
      {
        id: 'chunk-general',
        workspace_id: testWsId,
        chatbot_id: testBotId,
        content: 'We offer great electronics and smart accessories for all customers.',
        chunk_index: 0,
        token_count: 15,
        content_hash: 'hash1',
        embedding: embeddingGeneral,
        metadata: { title: 'General Overview' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'chunk-specific',
        workspace_id: testWsId,
        chatbot_id: testBotId,
        content: 'The Samsung Galaxy A36 comes with 8GB RAM, 5000mAh battery, and is priced at ₹14,999.',
        chunk_index: 1,
        token_count: 22,
        content_hash: 'hash2',
        embedding: embeddingSpecific,
        metadata: { title: 'Samsung Galaxy A36 Specs' },
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await retrieveRelevantKnowledge({
      workspaceId: testWsId,
      chatbotId: testBotId,
      query: 'What is the price of Samsung Galaxy A36?',
      options: {
        entities: ['Samsung Galaxy A36'],
        intent: 'PRICING',
      },
    });

    assert.ok(res.chunks.length > 0);
    assert.strictEqual(
      res.chunks[0].id,
      'chunk-specific',
      `Expected chunk-specific to be ranked first, got: ${res.chunks[0].id}`
    );
    assert.ok(res.chunks[0].content.includes('₹14,999'));
  });

  // --------------------------------------------------------------------------
  // TEST 5: Zero-Guessing Guard: Refuses to hallucinate when evidence is absent
  // --------------------------------------------------------------------------
  await runTest('Zero-Guessing Guard: Gracefully refuses when evidence is missing', () => {
    const analyzed = analyzeAndRewriteQuery({
      currentMessage: 'What is the CEO personal mobile number?',
      history: [],
    });

    const emptyChunks: RetrievedChunk[] = [];
    const strength = evaluateEvidenceStrength(emptyChunks, analyzed);
    assert.strictEqual(strength, 'NONE');

    const verification = verifyAndCleanResponse({
      draftResponse: 'The CEO phone number is +91 9876543210.',
      retrievedChunks: emptyChunks,
      analyzedQuery: analyzed,
      businessName: 'BiharStack AI',
    });

    assert.strictEqual(verification.zeroGuessTriggered, true);
    assert.ok(
      verification.finalResponse.includes('verified') ||
        verification.finalResponse.includes('records') ||
        verification.finalResponse.includes('contact'),
      `Expected zero-guess refusal, got: "${verification.finalResponse}"`
    );
    assert.ok(!verification.finalResponse.includes('+91 9876543210'));
  });

  // --------------------------------------------------------------------------
  // TEST 6: Numerical Integrity Verifier: Intercepts altered prices
  // --------------------------------------------------------------------------
  await runTest('Fact Verifier: Detects hallucinated prices not present in context', () => {
    const verifiedChunk: RetrievedChunk = {
      id: 'chunk-1',
      content: 'The official price for our BiharStack Pro Plan is ₹1,499 per month.',
      similarity: 0.9,
      url: 'https://biharstack.ai/pricing',
      title: 'Pricing Plan',
    };

    const analyzed = analyzeAndRewriteQuery({
      currentMessage: 'What is the price of Pro Plan?',
      history: [],
    });

    // Case A: Accurate draft that uses the exact source number
    const accurateVerification = verifyAndCleanResponse({
      draftResponse: 'The BiharStack Pro Plan is available for ₹1,499 per month.',
      retrievedChunks: [verifiedChunk],
      analyzedQuery: analyzed,
      businessName: 'BiharStack AI',
    });
    assert.strictEqual(accurateVerification.isValid, true);
    assert.ok(accurateVerification.finalResponse.includes('₹1,499'));

    // Case B: Hallucinated draft where LLM altered the price to ₹1,599
    const hallucinatedVerification = verifyAndCleanResponse({
      draftResponse: 'The BiharStack Pro Plan is priced at ₹1,599 and includes 99.9% uptime with 48 days warranty.',
      retrievedChunks: [verifiedChunk],
      analyzedQuery: analyzed,
      businessName: 'BiharStack AI',
    });
    assert.strictEqual(hallucinatedVerification.isValid, false);
    assert.ok(
      hallucinatedVerification.unsupportedClaims.some((c) => c.includes('1599')),
      'Expected unsupported claim for hallucinated 1599'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 7: End-to-End Chat Process Flow with Grounding & Citation
  // --------------------------------------------------------------------------
  await runTest('End-to-End Grounded Chat: Generates verified response with exact citations', async () => {
    const testBotId = 'bot-benchmark-e2e';
    const testWsId = 'ws-benchmark';

    inMemoryChatbots.set(testBotId, {
      id: testBotId,
      public_id: testBotId,
      workspace_id: testWsId,
      name: 'BiharStack Tech',
      assistant_name: 'TechBot',
      description: 'Official tech assistant',
      industry: 'Technology',
      language: 'English',
      website_url: 'https://biharstack.ai',
      website_confirmed: true,
      welcome_message: 'Hello! How can I help you?',
      tone: 'Professional',
      response_style: 'Balanced',
      lead_collection_enabled: false,
      lead_fields: { name: true, email: true, phone: false },
      primary_cta: 'Contact Us',
      secondary_cta: 'Explore',
      avatar_type: 'default_icon',
      brand_color: '#2563EB',
      widget_enabled: true,
      allowed_domains: [],
      widget_position: 'bottom-right',
      status: 'active',
      created_at: new Date().toISOString(),
    });

    const embedding = generateLocalEmbedding('Our refund policy permits 14 days full refund no questions asked');
    await saveKnowledgeChunks(testWsId, testBotId, [
      {
        id: 'chunk-refund',
        workspace_id: testWsId,
        chatbot_id: testBotId,
        content: 'We provide a 14-day full refund policy and money-back guarantee for all course subscriptions.',
        chunk_index: 0,
        token_count: 18,
        content_hash: 'hash-ref',
        embedding,
        metadata: {
          title: 'Refund Policy',
          url: 'https://biharstack.ai/refund-policy',
        },
        created_at: new Date().toISOString(),
      },
    ]);

    const chatResponse = await processChatMessage({
      workspaceId: testWsId,
      chatbotId: testBotId,
      userMessage: 'What is the refund period for courses?',
    });

    assert.ok(chatResponse.message.length > 0);
    assert.ok(
      chatResponse.message.includes('14') || chatResponse.message.toLowerCase().includes('guarantee'),
      `Expected answer to contain verified 14-day policy, got: "${chatResponse.message}"`
    );
    assert.ok(chatResponse.sources.length > 0);
    assert.strictEqual(chatResponse.sources[0].title, 'Refund Policy');
  });

  console.log('\n================================================================');
  console.log(`📊 BENCHMARK RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGroundingBenchmark().catch((err) => {
  console.error('Fatal benchmark runner error:', err);
  process.exit(1);
});
