'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { ToolType } from '@/lib/agents/types';
import {
  Cpu,
  ArrowLeft,
  BookOpen,
  Calculator,
  Globe,
  Database,
  ShieldAlert,
  Loader2,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';

export default function CreateAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get('template');

  const { workspace, loading: authLoading } = useAuth();
  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [maxSteps, setMaxSteps] = useState(5);
  const [status, setStatus] = useState<'active' | 'draft'>('active');

  // Tools Selection State
  const [enableKnowledge, setEnableKnowledge] = useState(true);
  const [enableCalculator, setEnableCalculator] = useState(true);
  const [enableHttp, setEnableHttp] = useState(false);
  const [httpAllowedDomains, setHttpAllowedDomains] = useState('');
  const [enableApi, setEnableApi] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = workspace?.id || 'ws-demo-01';

  // Apply template prefill
  useEffect(() => {
    if (template === 'support') {
      setName('Customer Support Agent');
      setPurpose('Answer customer questions, order status inquiries, and compute refund/tax numbers.');
      setDescription('Autonomous customer support agent equipped with verified business knowledge and safe math calculations.');
      setInstructions(`You are the primary Customer Support AI Agent.
1. Use company knowledge base whenever possible to give verified facts.
2. Use the calculator tool for any price calculations, tax computations, or discounts.
3. Never invent policies or prices. If information is missing, state it clearly.`);
      setEnableKnowledge(true);
      setEnableCalculator(true);
      setEnableHttp(false);
    } else if (template === 'sales') {
      setName('Sales Qualification Agent');
      setPurpose('Qualify inbound business prospects and recommend suitable enterprise software plans.');
      setDescription('Sales qualification agent answering product questions using indexed company offerings.');
      setInstructions(`You are the Sales Qualification AI Agent.
1. Understand the visitor's company size, pain points, and requirements.
2. Recommend the best tier from company knowledge.
3. Be professional, direct, and concise.`);
      setEnableKnowledge(true);
      setEnableCalculator(false);
      setEnableHttp(false);
    } else if (template === 'research') {
      setName('Website Researcher Agent');
      setPurpose('Fetch approved web pages and documentation to synthesize insights.');
      setDescription('Research agent with controlled HTTP GET access and SSRF protection.');
      setInstructions(`You are a Website Researcher AI Agent.
1. Fetch and analyze authorized documentation URLs.
2. Summarize key facts accurately and report sources.`);
      setEnableKnowledge(true);
      setEnableCalculator(false);
      setEnableHttp(true);
    } else {
      setName('Enterprise AI Agent');
      setPurpose('Assist team members and customers with business tasks.');
      setDescription('General business AI agent.');
      setInstructions(`You are a helpful AI Agent for this business.
Follow user instructions carefully and use permitted tools to find facts or compute numbers.`);
    }
  }, [template]);

  useEffect(() => {
    const loadBots = async () => {
      const bots = await ChatbotService.getChatbots(workspaceId);
      setChatbots(bots);
      if (bots.length > 0) {
        setSelectedChatbotId(bots[0].id || '');
      }
    };

    if (!authLoading) {
      loadBots();
    }
  }, [authLoading, workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !purpose.trim() || !instructions.trim()) {
      setError('Please provide Name, Purpose, and Instructions for the agent.');
      return;
    }

    setSaving(true);
    setError(null);

    // Build tools payload
    const tools: Array<{
      tool_type: ToolType;
      name: string;
      description: string;
      configuration?: Record<string, any>;
      enabled: boolean;
    }> = [];

    if (enableKnowledge) {
      tools.push({
        tool_type: 'knowledge_search',
        name: 'Knowledge Search',
        description: 'Semantic retrieval across connected company knowledge chunks',
        enabled: true,
        configuration: {},
      });
    }

    if (enableCalculator) {
      tools.push({
        tool_type: 'calculator',
        name: 'Calculator',
        description: 'Safe arithmetic parser for pricing, tax, and math',
        enabled: true,
        configuration: {},
      });
    }

    if (enableHttp) {
      const domains = httpAllowedDomains
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean);
      tools.push({
        tool_type: 'http_request',
        name: 'HTTP Request',
        description: 'Controlled HTTP GET with SSRF protection',
        enabled: true,
        configuration: {
          allowed_domains: domains,
        },
      });
    }

    if (enableApi && apiEndpoint.trim()) {
      tools.push({
        tool_type: 'configured_api',
        name: 'Configured API Tool',
        description: 'Execute workspace pre-configured business API endpoint',
        enabled: true,
        configuration: {
          endpoint: apiEndpoint.trim(),
          method: 'POST',
        },
      });
    }

    try {
      const res = await fetch(`/api/v1/agents?workspace_id=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          purpose: purpose.trim(),
          description: description.trim() || undefined,
          system_instructions: instructions.trim(),
          chatbot_id: selectedChatbotId || undefined,
          model,
          temperature,
          max_steps: maxSteps,
          status,
          tools,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create agent');
      }

      router.push(`/ai-agents/${json.data.id}/test`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the agent.');
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-4xl mx-auto pb-20">
        {/* Back navigation */}
        <div className="flex items-center gap-3">
          <Link
            href="/ai-agents"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Create AI Agent
            </h1>
            <p className="text-xs text-slate-500">
              Configure autonomous reasoning, connected business knowledge, and safe tools.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Agent Basics */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">1. Agent Basics</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agent Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Support AI"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Connected Chatbot / Knowledge Base
                </label>
                <select
                  value={selectedChatbotId}
                  onChange={(e) => setSelectedChatbotId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">No Knowledge Base (General Agent)</option>
                  {chatbots.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.website_url || 'Custom Knowledge'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Core Purpose *
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="What is this agent's primary business responsibility?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Step 2: System Instructions */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">2. System Instructions & Persona</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                System Instructions *
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Define the agent's behavior, tone, when to call tools, and anti-hallucination guardrails.
              </p>
              <textarea
                rows={5}
                required
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Step 3: Model & Reasoning Ceiling */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">3. Reasoning & Limits</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Grounded)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Temperature</label>
                  <span className="text-xs font-mono font-bold text-blue-600">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Max Reasoning Steps
                </label>
                <select
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value={3}>3 Steps (Fast)</option>
                  <option value={5}>5 Steps (Standard Default)</option>
                  <option value={8}>8 Steps (Complex Analysis)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 4: Tools Selection */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">4. Tool Permissions & Marketplace</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">
                Strict schema validation & timeouts enforced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tool 1: Knowledge Search */}
              <div
                onClick={() => setEnableKnowledge(!enableKnowledge)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  enableKnowledge
                    ? 'border-purple-600 bg-purple-50/30 ring-1 ring-purple-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Knowledge Search</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      enableKnowledge ? 'bg-purple-600 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {enableKnowledge && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Enables semantic search across your website pages, documentation, and refund policies.
                </p>
              </div>

              {/* Tool 2: Safe Calculator */}
              <div
                onClick={() => setEnableCalculator(!enableCalculator)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  enableCalculator
                    ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Calculator className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Safe Calculator</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      enableCalculator ? 'bg-blue-600 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {enableCalculator && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Safe mathematical parser for GST, discounts, and order calculations with zero eval.
                </p>
              </div>

              {/* Tool 3: Controlled HTTP GET */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  enableHttp
                    ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600'
                    : 'border-slate-200'
                }`}
              >
                <div
                  onClick={() => setEnableHttp(!enableHttp)}
                  className="flex items-center justify-between mb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">HTTP Web Request</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      enableHttp ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {enableHttp && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Controlled HTTP GET with SSRF protection. Blocks localhost, private subnets, and cloud metadata.
                </p>

                {enableHttp && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Allowed Domains (Optional, 1 per line)
                    </label>
                    <textarea
                      rows={2}
                      value={httpAllowedDomains}
                      onChange={(e) => setHttpAllowedDomains(e.target.value)}
                      placeholder="e.g. biharstack.ai&#10;api.github.com"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Tool 4: Configured API */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  enableApi
                    ? 'border-amber-600 bg-amber-50/30 ring-1 ring-amber-600'
                    : 'border-slate-200'
                }`}
              >
                <div
                  onClick={() => setEnableApi(!enableApi)}
                  className="flex items-center justify-between mb-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">Configured Business API</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      enableApi ? 'bg-amber-600 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {enableApi && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Allows the agent to trigger a pre-configured business API endpoint with server-stored credentials.
                </p>

                {enableApi && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      API Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.yourcompany.com/v1/leads"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href="/ai-agents"
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring Agent...</span>
                </>
              ) : (
                <span>Activate Agent & Open Tester →</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
