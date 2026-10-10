import assert from 'assert';
import {
  AgentService,
  inMemoryAgents,
  inMemoryAgentTools,
  inMemoryAgentRuns,
} from '../lib/agents/agent-service';
import { safeEvaluateMath, CalculatorTool } from '../lib/agents/tools/calculator';
import { isSsrfTarget, HttpGetTool } from '../lib/agents/tools/http-get';
import { KnowledgeSearchTool } from '../lib/agents/tools/knowledge-search';
import { getToolHandler, validateToolInput } from '../lib/agents/tools/registry';
import { runAgentLoop } from '../lib/agents/engine';
import { saveKnowledgeChunks, inMemoryKnowledgeChunks } from '../lib/knowledge/vector-store';
import { generateLocalEmbedding } from '../lib/embeddings/embedding-service';

async function runStep9Tests() {
  console.log('🧪 [Step 9 Test Suite] Verifying AI Agents Platform...\n');

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

  // Clear in-memory state before testing
  inMemoryAgents.clear();
  inMemoryAgentTools.clear();
  inMemoryAgentRuns.clear();

  // ==========================================
  // SECTION 1: Safe Calculator Tool & AST Math
  // ==========================================
  console.log('--- 1. Safe Calculator AST Parser ---');

  test('Calculator: Respects operator precedence (* and / before + and -)', () => {
    assert.strictEqual(safeEvaluateMath('2 + 3 * 4'), 14);
    assert.strictEqual(safeEvaluateMath('10 - 6 / 2'), 7);
  });

  test('Calculator: Handles parentheses correctly', () => {
    assert.strictEqual(safeEvaluateMath('(2 + 3) * 4'), 20);
    assert.strictEqual(safeEvaluateMath('((10 + 20) / 2) + 5'), 20);
  });

  test('Calculator: Evaluates floating point decimals & percentages', () => {
    const result = safeEvaluateMath('50000 * 0.18');
    assert.strictEqual(result, 9000);
    assert.strictEqual(safeEvaluateMath('12.5 + 7.5'), 20);
  });

  test('Calculator: Evaluates exponentiation (^) and modulo (%)', () => {
    assert.strictEqual(safeEvaluateMath('2 ^ 8'), 256);
    assert.strictEqual(safeEvaluateMath('10 % 3'), 1);
  });

  test('Calculator: Gracefully rejects division by zero', () => {
    assert.throws(
      () => safeEvaluateMath('100 / 0'),
      /Division by zero is undefined/i
    );
  });

  test('Calculator: Strictly blocks letters, script tags, and code injection', () => {
    assert.throws(
      () => safeEvaluateMath('console.log("hacked")'),
      /Only numbers and mathematical operators/i
    );
    assert.throws(
      () => safeEvaluateMath('process.exit(1)'),
      /Only numbers and mathematical operators/i
    );
    assert.throws(
      () => safeEvaluateMath('2 + require("fs")'),
      /Only numbers and mathematical operators/i
    );
    assert.throws(
      () => safeEvaluateMath('<script>alert(1)</script>'),
      /Only numbers and mathematical operators/i
    );
  });

  await asyncTest('CalculatorTool handler execution returns formatted output', async () => {
    const res = await CalculatorTool.execute({ expression: '1500 * 1.18' }, {
      workspaceId: 'ws-test',
      agentId: 'agent-test',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.result, 1770);
    assert.strictEqual(res.data?.expression, '1500 * 1.18');
  });

  // ==========================================
  // SECTION 2: Controlled HTTP Tool & SSRF Defenses
  // ==========================================
  console.log('\n--- 2. Controlled HTTP & SSRF Protection ---');

  test('SSRF Protection: Blocks loopback hostnames (localhost, 127.0.0.1, 0.0.0.0, ::1)', () => {
    assert.strictEqual(isSsrfTarget('localhost').blocked, true);
    assert.strictEqual(isSsrfTarget('127.0.0.1').blocked, true);
    assert.strictEqual(isSsrfTarget('0.0.0.0').blocked, true);
    assert.strictEqual(isSsrfTarget('::1').blocked, true);
  });

  test('SSRF Protection: Blocks RFC1918 Private IPv4 ranges', () => {
    // 10.0.0.0/8
    assert.strictEqual(isSsrfTarget('10.0.0.1').blocked, true);
    assert.strictEqual(isSsrfTarget('10.254.1.5').blocked, true);

    // 172.16.0.0/12
    assert.strictEqual(isSsrfTarget('172.16.0.1').blocked, true);
    assert.strictEqual(isSsrfTarget('172.31.255.254').blocked, true);
    // Public 172 range (e.g. 172.32.0.1) should NOT be blocked by 172.16/12 rule
    assert.strictEqual(isSsrfTarget('172.32.0.1').blocked, false);

    // 192.168.0.0/16
    assert.strictEqual(isSsrfTarget('192.168.1.1').blocked, true);
    assert.strictEqual(isSsrfTarget('192.168.100.50').blocked, true);
  });

  test('SSRF Protection: Blocks Cloud Metadata Endpoints', () => {
    assert.strictEqual(isSsrfTarget('169.254.169.254').blocked, true);
    assert.strictEqual(isSsrfTarget('metadata.google.internal').blocked, true);
    assert.strictEqual(isSsrfTarget('metadata').blocked, true);
  });

  test('SSRF Protection: Blocks internal domain suffixes (.local, .internal, .lan)', () => {
    assert.strictEqual(isSsrfTarget('database.service.internal').blocked, true);
    assert.strictEqual(isSsrfTarget('redis.company.local').blocked, true);
    assert.strictEqual(isSsrfTarget('vault.secure.lan').blocked, true);
  });

  test('SSRF Protection: Allows legitimate public web domains', () => {
    assert.strictEqual(isSsrfTarget('biharstack.ai').blocked, false);
    assert.strictEqual(isSsrfTarget('api.github.com').blocked, false);
    assert.strictEqual(isSsrfTarget('example.com').blocked, false);
  });

  await asyncTest('HttpGetTool: Rejects loopback & invalid protocols safely', async () => {
    const loopbackRes = await HttpGetTool.execute({ url: 'http://127.0.0.1:8000/admin' }, {
      workspaceId: 'ws-test',
      agentId: 'agent-test',
    });
    assert.strictEqual(loopbackRes.success, false);
    assert(loopbackRes.error?.includes('prohibited') || loopbackRes.error?.includes('SSRF'));

    const fileProtoRes = await HttpGetTool.execute({ url: 'file:///etc/passwd' }, {
      workspaceId: 'ws-test',
      agentId: 'agent-test',
    });
    assert.strictEqual(fileProtoRes.success, false);
    assert(/only http.*and https/i.test(fileProtoRes.error || '') || fileProtoRes.error?.includes('blocked'));
  });

  // ==========================================
  // SECTION 3: Knowledge Search Tool & Workspace Isolation
  // ==========================================
  console.log('\n--- 3. Knowledge Search Tool & Workspace Isolation ---');

  const wsAlpha = 'ws-test-alpha';
  const wsBeta = 'ws-test-beta';
  const botAlpha = 'bot-alpha-101';

  await asyncTest('Seed knowledge chunks and verify isolated retrieval by KnowledgeSearchTool', async () => {
    inMemoryKnowledgeChunks.clear();

    const embedSample = generateLocalEmbedding('BiharStack enterprise pricing starts at $49/month with 10k messages.');

    await saveKnowledgeChunks(wsAlpha, botAlpha, [
      {
        id: 'chunk-alpha-1',
        workspace_id: wsAlpha,
        chatbot_id: botAlpha,
        knowledge_source_id: 'src-1',
        chunk_index: 0,
        content: 'BiharStack enterprise pricing starts at $49/month with 10k messages. Annual plan includes 20% discount.',
        content_hash: 'hash123',
        embedding: embedSample,
        token_count: 25,
        metadata: { title: 'Pricing' },
        created_at: new Date().toISOString(),
      },
    ]);

    // Workspace Alpha search
    const alphaSearch = await KnowledgeSearchTool.execute({ query: 'enterprise pricing' }, {
      workspaceId: wsAlpha,
      agentId: 'agent-alpha',
      chatbotId: botAlpha,
    });
    assert.strictEqual(alphaSearch.success, true);
    assert(alphaSearch.data?.count >= 1);
    assert(alphaSearch.data?.results[0].content.includes('49/month'));

    // Workspace Beta search must NOT see Alpha's knowledge
    const betaSearch = await KnowledgeSearchTool.execute({ query: 'enterprise pricing' }, {
      workspaceId: wsBeta,
      agentId: 'agent-beta',
    });
    assert.strictEqual(betaSearch.success, true);
    assert.strictEqual(betaSearch.data?.count, 0, 'Workspace Beta must not access Workspace Alpha knowledge chunks');
  });

  // ==========================================
  // SECTION 4: Agent Service, CRUD & Duplication
  // ==========================================
  console.log('\n--- 4. Agent Service & Lifecycle ---');

  let createdAgent: any;

  await asyncTest('AgentService: Seeds default agents for new workspace', async () => {
    const defaultAgents = await AgentService.getAgents(wsAlpha);
    assert(defaultAgents.length >= 3, 'Seeds at least 3 default agent templates');
    const sales = defaultAgents.find((a) => a.purpose.includes('Sales') || a.name.includes('Sales'));
    assert(sales !== undefined, 'Sales & Lead qualifier agent exists');
  });

  await asyncTest('AgentService: Create custom AI Agent with configured tools', async () => {
    createdAgent = await AgentService.createAgent(wsAlpha, {
      name: 'Custom Finance Agent',
      purpose: 'Calculate quotes, tax, and search pricing policies',
      system_instructions: 'You calculate GST and retrieve business pricing details.',
      model: 'gemini-1.5-flash',
      temperature: 0.1,
      max_steps: 4,
      chatbot_id: botAlpha,
      tools: [
        {
          tool_type: 'calculator',
          name: 'Calculator Tool',
          description: 'Perform math calculations',
          enabled: true,
          configuration: {},
        },
        {
          tool_type: 'knowledge_search',
          name: 'Knowledge Search',
          description: 'Search pricing documentation',
          enabled: true,
          configuration: {},
        },
      ],
    });

    assert(createdAgent.id, 'Agent has an ID');
    assert.strictEqual(createdAgent.name, 'Custom Finance Agent');
    assert.strictEqual(createdAgent.max_steps, 4);
    assert.strictEqual(createdAgent.tools.length, 2);
  });

  await asyncTest('AgentService: Update agent configuration and status', async () => {
    const updated = await AgentService.updateAgent(wsAlpha, createdAgent.id, {
      temperature: 0.3,
      max_steps: 6,
    });
    assert.strictEqual(updated?.temperature, 0.3);
    assert.strictEqual(updated?.max_steps, 6);
  });

  await asyncTest('AgentService: Duplicate agent creates copy with draft status', async () => {
    const duplicate = await AgentService.duplicateAgent(wsAlpha, createdAgent.id);
    assert(duplicate !== null);
    assert.strictEqual(duplicate?.name, 'Custom Finance Agent (Copy)');
    assert.strictEqual(duplicate?.status, 'draft');
    assert.notStrictEqual(duplicate?.id, createdAgent.id);
    assert.strictEqual(duplicate?.tools?.length, 2);
  });

  await asyncTest('AgentService: Multi-tenant isolation prevents cross-workspace access', async () => {
    // Attempt to fetch Alpha's agent using Beta workspace ID
    const crossAccess = await AgentService.getAgentById(wsBeta, createdAgent.id);
    assert.strictEqual(crossAccess, null, 'Workspace Beta cannot access Workspace Alpha agent');

    // Attempt to update Alpha's agent using Beta workspace ID
    const crossUpdate = await AgentService.updateAgent(wsBeta, createdAgent.id, { name: 'Hacked' });
    assert.strictEqual(crossUpdate, null, 'Workspace Beta cannot update Workspace Alpha agent');
  });

  // ==========================================
  // SECTION 5: Agent Execution Loop & Step Traces
  // ==========================================
  console.log('\n--- 5. Autonomous Agent Execution Loop ---');

  await asyncTest('runAgentLoop: Successfully executes tool call and returns final answer with trace', async () => {
    const runRes = await runAgentLoop({
      agent: createdAgent,
      tools: createdAgent.tools,
      userInput: 'Calculate 18% GST on ₹50,000',
      workspaceId: wsAlpha,
    });

    assert.strictEqual(runRes.status, 'completed');
    assert(runRes.output.includes('9000'), 'Output contains calculated GST (9000)');
    assert(runRes.steps.length >= 1, 'Trace includes step record');

    const firstStep = runRes.steps[0];
    assert.strictEqual(firstStep.tool_name?.toLowerCase(), 'calculator');
    assert.strictEqual(firstStep.status, 'success');
    assert.strictEqual(firstStep.tool_output?.result, 9000);
    assert(firstStep.latency_ms >= 0);

    // Verify raw chain-of-thought or internal scratchpad is not exposed
    assert.strictEqual((runRes as any).raw_prompt, undefined);
    assert.strictEqual((runRes as any).internal_scratchpad, undefined);
  });

  await asyncTest('AgentService.runAgent: Executes, records run history and telemetry', async () => {
    const run = await AgentService.runAgent({
      workspaceId: wsAlpha,
      agentId: createdAgent.id,
      userInput: 'What is the enterprise pricing?',
    });

    assert.strictEqual(run.status, 'completed');
    assert(run.output.length > 0);
    assert(run.id.startsWith('run_'));

    // Verify run history record
    const runs = await AgentService.getAgentRuns(wsAlpha, createdAgent.id);
    assert(runs.length >= 1);
    assert.strictEqual(runs[0].agent_id, createdAgent.id);
    assert.strictEqual(runs[0].status, 'completed');
  });

  await asyncTest('AgentService.runAgent: Rejects execution of paused or archived agent', async () => {
    await AgentService.updateAgent(wsAlpha, createdAgent.id, { status: 'paused' });

    let caughtError = false;
    try {
      await AgentService.runAgent({
        workspaceId: wsAlpha,
        agentId: createdAgent.id,
        userInput: 'Hello',
      });
    } catch (err: any) {
      caughtError = true;
      assert(err.message.includes('paused'));
    }
    assert.strictEqual(caughtError, true, 'Execution of paused agent was blocked');

    // Restore to active
    await AgentService.updateAgent(wsAlpha, createdAgent.id, { status: 'active' });
  });

  await asyncTest('AgentService.runAgent: Blocks cross-workspace execution with error', async () => {
    let caughtIsolation = false;
    try {
      await AgentService.runAgent({
        workspaceId: wsBeta, // Cross workspace!
        agentId: createdAgent.id,
        userInput: 'Calculate 10 + 20',
      });
    } catch (err: any) {
      caughtIsolation = true;
      assert(err.message.includes('not found in this workspace'));
    }
    assert.strictEqual(caughtIsolation, true, 'Cross-workspace execution strictly blocked');
  });

  await asyncTest('runAgentLoop: Enforces max_steps bound and does not loop infinitely', async () => {
    const tinyAgent = {
      ...createdAgent,
      max_steps: 2,
    };

    const runRes = await runAgentLoop({
      agent: tinyAgent,
      tools: createdAgent.tools,
      userInput: 'Calculate 10 + 10',
      workspaceId: wsAlpha,
    });

    assert(runRes.steps.length <= 2, 'Execution steps strictly bounded by max_steps');
  });

  console.log('\n==========================================');
  console.log(`🎉 [Step 9 Test Suite Complete] ${passed} passed, ${failed} failed`);
  console.log('==========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep9Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
