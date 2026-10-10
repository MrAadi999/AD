import assert from 'assert';
import { cleanRawText } from '../lib/knowledge/cleaner';
import { chunkDocument, estimateTokenCount } from '../lib/knowledge/chunker';
import {
  generateLocalEmbedding,
  generateEmbedding,
  generateEmbeddingsBatch,
} from '../lib/embeddings/embedding-service';
import {
  saveKnowledgeChunks,
  getChunksForChatbot,
  getChunkStatsForChatbot,
  deleteChunksForSource,
  searchSimilarChunks,
  inMemoryKnowledgeChunks,
  cosineSimilarity,
} from '../lib/knowledge/vector-store';
import { processKnowledgeSource } from '../lib/knowledge/processor';

async function runTests() {
  console.log('🧪 [Step 5 Test Suite] Starting verification...\n');

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

  // 1. Text Cleaner Verification
  test('Cleaner decodes HTML entities and normalizes whitespace', () => {
    const raw = '&copy; 2026 BiharStack &amp; Partners &lt;All Rights Reserved&gt;   \n\n\n   Welcome to  our  portal!';
    const cleaned = cleanRawText(raw);
    assert(!cleaned.includes('&copy;'), 'HTML entities should be decoded');
    assert(cleaned.includes('© 2026 BiharStack & Partners <All Rights Reserved>'), 'Decoded correctly');
    assert(cleaned.includes('Welcome to our portal!'), 'Excess space removed');
  });

  test('Cleaner filters out generic web boilerplate lines', () => {
    const raw = `
      # BiharStack Services
      We build AI assistants for local businesses in Bihar.
      Accept all cookies
      Cookie policy
      Subscribe to our newsletter
      Click here to learn more.
    `;
    const cleaned = cleanRawText(raw);
    assert(cleaned.includes('BiharStack Services'), 'Real content preserved');
    assert(!cleaned.toLowerCase().includes('accept all cookies'), 'Boilerplate removed');
    assert(!cleaned.toLowerCase().includes('cookie policy'), 'Cookie banner stripped');
  });

  test('Cleaner deduplicates consecutive repeated lines', () => {
    const raw = 'BiharStack AI\nBiharStack AI\nBiharStack AI\nLeading the frontier.';
    const cleaned = cleanRawText(raw);
    const occurrences = cleaned.split('BiharStack AI').length - 1;
    assert.strictEqual(occurrences, 1, 'Consecutive duplicates collapsed to 1');
  });

  // 2. Chunker Verification
  test('Token estimator calculates ~4 chars per token correctly', () => {
    assert.strictEqual(estimateTokenCount('abcd'), 1);
    assert.strictEqual(estimateTokenCount('abcdefgh'), 2);
    assert.strictEqual(estimateTokenCount(''), 0);
  });

  test('Chunker splits large document into ~600-token chunks with overlap', () => {
    const paragraph = 'BiharStack provides state-of-the-art AI automation for enterprise and SME clients across Bihar and India. Our autonomous agents handle customer support, inventory queries, and booking 24/7 without delays. ';
    const longText = paragraph.repeat(40);

    const chunks = chunkDocument(longText, {
      url: 'https://biharstack.com/about',
      title: 'About BiharStack',
      source_type: 'website',
    }, { maxTokens: 400, overlapTokens: 60 });

    assert(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      assert(c.content.length > 50, 'Chunk has content');
      assert.strictEqual(c.metadata.url, 'https://biharstack.com/about');
      assert.strictEqual(c.metadata.title, 'About BiharStack');
      assert.strictEqual(c.metadata.chunk_index, i);
      assert.strictEqual(c.metadata.total_chunks, chunks.length);
      assert(c.content_hash && c.content_hash.length === 64, 'SHA-256 content hash exists');
    }
  });

  test('Chunker ignores short noise fragments under minimum word threshold', () => {
    const noise = 'hi';
    const chunks = chunkDocument(noise, {
      url: 'https://biharstack.com',
      title: 'Home',
      source_type: 'website',
    });
    assert.strictEqual(chunks.length, 0, 'Noise chunk suppressed');
  });

  // 3. Embedding Service Verification
  test('Local embedding generator outputs 768-dim normalized unit vector', () => {
    const vec = generateLocalEmbedding('BiharStack AI for Every Business');
    assert.strictEqual(vec.length, 768, 'Must have exactly 768 dimensions');

    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    assert(Math.abs(norm - 1.0) < 0.05, `Vector must be normalized (norm: ${norm})`);
  });

  test('Semantic cosine similarity is higher for related texts than unrelated texts', () => {
    const v1 = generateLocalEmbedding('BiharStack AI customer support and automated chatbots');
    const v2 = generateLocalEmbedding('automated chatbot for customer support inquiries');
    const v3 = generateLocalEmbedding('geology of tectonic volcanic continental drift');

    const simRelated = cosineSimilarity(v1, v2);
    const simUnrelated = cosineSimilarity(v1, v3);

    console.log(`     (simRelated: ${simRelated.toFixed(3)}, simUnrelated: ${simUnrelated.toFixed(3)})`);
    assert(simRelated > simUnrelated, 'Related text must score higher cosine similarity');
  });

  await asyncTest('Batch embedding generation returns matching quantity of vectors', async () => {
    const texts = [
      'Welcome to BiharStack',
      'AI chatbot onboarding',
      'Enterprise customer care',
    ];
    const embeddings = await generateEmbeddingsBatch(texts);
    assert.strictEqual(embeddings.length, 3);
    assert.strictEqual(embeddings[0].length, 768);
    assert.strictEqual(embeddings[1].length, 768);
    assert.strictEqual(embeddings[2].length, 768);
  });

  // 4. Vector Store & Tenant Isolation Verification
  await asyncTest('Vector store saves, retrieves, and enforces strict chatbot isolation', async () => {
    inMemoryKnowledgeChunks.clear();

    const bot1Chunks = [
      {
        id: 'c1',
        workspace_id: 'ws-100',
        chatbot_id: 'bot-alpha',
        knowledge_source_id: 'src-1',
        content: 'BiharStack AI pricing starts at 999 INR per month.',
        chunk_index: 0,
        token_count: 15,
        content_hash: 'hash1',
        embedding: generateLocalEmbedding('BiharStack AI pricing starts at 999 INR per month.'),
        metadata: { url: 'https://biharstack.com/pricing', title: 'Pricing' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'c2',
        workspace_id: 'ws-100',
        chatbot_id: 'bot-alpha',
        knowledge_source_id: 'src-2',
        content: 'Contact support at help@biharstack.com for queries.',
        chunk_index: 0,
        token_count: 12,
        content_hash: 'hash2',
        embedding: generateLocalEmbedding('Contact support at help@biharstack.com for queries.'),
        metadata: { url: 'https://biharstack.com/contact', title: 'Contact' },
        created_at: new Date().toISOString(),
      },
    ];

    const bot2Chunks = [
      {
        id: 'c3',
        workspace_id: 'ws-100',
        chatbot_id: 'bot-beta',
        knowledge_source_id: 'src-3',
        content: 'Confidential secret product roadmap of Bot Beta.',
        chunk_index: 0,
        token_count: 10,
        content_hash: 'hash3',
        embedding: generateLocalEmbedding('Confidential secret product roadmap of Bot Beta.'),
        metadata: { url: 'https://secret.com', title: 'Secret' },
        created_at: new Date().toISOString(),
      },
    ];

    await saveKnowledgeChunks('ws-100', 'bot-alpha', bot1Chunks);
    await saveKnowledgeChunks('ws-100', 'bot-beta', bot2Chunks);

    // Verify stats
    const statsAlpha = await getChunkStatsForChatbot('ws-100', 'bot-alpha');
    assert.strictEqual(statsAlpha.totalChunks, 2);
    assert.strictEqual(statsAlpha.totalTokens, 27);

    // Verify search on bot-alpha
    const queryEmb = generateLocalEmbedding('How much does BiharStack cost?');
    const searchAlpha = await searchSimilarChunks({
      workspaceId: 'ws-100',
      chatbotId: 'bot-alpha',
      queryEmbedding: queryEmb,
      topK: 5,
      similarityThreshold: 0.1,
    });

    assert(searchAlpha.length > 0, 'Should find matches in bot-alpha');
    assert(searchAlpha[0].content.includes('999 INR'), 'Top match should be pricing');

    // Strict Tenant Isolation check: bot-alpha query must NEVER retrieve bot-beta chunks
    const leaked = searchAlpha.find((m) => m.content.includes('Confidential secret'));
    assert(!leaked, 'CRITICAL: Bot-alpha must never access Bot-beta chunks');

    // Delete single source from bot-alpha
    await deleteChunksForSource('ws-100', 'bot-alpha', 'src-1');
    const remainingAlpha = await getChunksForChatbot('ws-100', 'bot-alpha');
    assert.strictEqual(remainingAlpha.length, 1);
    assert.strictEqual(remainingAlpha[0].id, 'c2');
  });

  // 5. End-to-End Knowledge Processor Verification
  await asyncTest('End-to-end pipeline processes raw source into embedded vector chunks', async () => {
    const rawSource = {
      id: 'src-e2e-test',
      workspace_id: 'ws-test',
      chatbot_id: 'bot-test',
      source_type: 'website' as const,
      url: 'https://biharstack.com/features',
      title: 'Features & Capabilities',
      content: `
        # BiharStack AI Features
        BiharStack automates omnichannel customer communication for Indian enterprises.
        
        ## Key Capabilities:
        - 2-minute instant website knowledge ingestion
        - Accurate pgvector semantic similarity search
        - Multi-tenant enterprise grade isolation
        - Tailored for Hindi, English, and regional dialects
        
        Join hundreds of businesses growing with BiharStack AI.
      `,
      content_hash: 'abc',
      status: 'completed' as const,
      word_count: 55,
      crawled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const res = await processKnowledgeSource('ws-test', 'bot-test', rawSource);
    assert.strictEqual(res.status, 'completed');
    assert(res.chunksCount >= 1, `Expected at least 1 chunk, got ${res.chunksCount}`);
    assert(res.tokensCount > 10, 'Tokens counted');

    // Query the newly processed source
    const searchRes = await searchSimilarChunks({
      workspaceId: 'ws-test',
      chatbotId: 'bot-test',
      queryEmbedding: generateLocalEmbedding('What are key capabilities of BiharStack?'),
      topK: 3,
      similarityThreshold: 0.1,
    });

    assert(searchRes.length >= 1, 'Should retrieve indexed feature chunk');
    assert(searchRes[0].content.includes('pgvector semantic similarity search'));
  });

  console.log(`\n========================================`);
  console.log(`🎉 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
