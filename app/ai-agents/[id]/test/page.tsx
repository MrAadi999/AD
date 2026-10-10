'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { AgentRecord, AgentStepTrace } from '@/lib/agents/types';
import {
  Cpu,
  ArrowLeft,
  Settings2,
  Send,
  Loader2,
  Calculator,
  BookOpen,
  Globe,
  Database,
  Clock,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Code2,
} from 'lucide-react';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: AgentStepTrace[];
  tool_calls_count?: number;
  tokens?: number;
  latency_ms?: number;
  timestamp: string;
}

export default function AgentChatTesterPage() {
  const params = useParams();
  const agentId = params.id as string;
  const { workspace, loading: authLoading } = useAuth();

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [activeToolIndicator, setActiveToolIndicator] = useState<string | null>(null);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workspaceId = workspace?.id || 'ws-demo-01';

  const fetchAgent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/agents/${agentId}?workspace_id=${workspaceId}`);
      if (res.ok) {
        const json = await res.json();
        setAgent(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch agent details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && agentId) {
      fetchAgent();
    }
  }, [authLoading, agentId, workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, executing]);

  const handleSend = async (textToSend?: string) => {
    const input = (textToSend || userInput).trim();
    if (!input || executing || !agent) return;

    setUserInput('');
    const userTurn: ChatTurn = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userTurn]);
    setExecuting(true);
    setActiveToolIndicator('Reasoning & selecting tools...');

    try {
      // Simulate active tool indicator while waiting
      if (input.toLowerCase().includes('calculate') || input.toLowerCase().includes('gst') || /\d+\s*[\*\+\-\/]\s*\d+/.test(input)) {
        setTimeout(() => setActiveToolIndicator('⚙ Executing safe calculator...'), 400);
      } else if (input.toLowerCase().includes('policy') || input.toLowerCase().includes('refund') || input.toLowerCase().includes('service')) {
        setTimeout(() => setActiveToolIndicator('🔎 Searching company knowledge base...'), 400);
      }

      const res = await fetch(`/api/v1/agents/${agentId}/run?workspace_id=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || 'Agent execution failed');
      }

      const botTurn: ChatTurn = {
        id: json.id || `ast_${Date.now()}`,
        role: 'assistant',
        content: json.output,
        steps: json.steps || [],
        tool_calls_count: json.tool_calls?.length || json.steps?.length || 0,
        tokens: json.usage?.total_tokens || 0,
        latency_ms: json.latency_ms || 0,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botTurn]);
      if (botTurn.steps && botTurn.steps.length > 0) {
        setExpandedTraceId(botTurn.id);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Agent Error: ${err.message || 'Execution failed.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setExecuting(false);
      setActiveToolIndicator(null);
    }
  };

  const samplePrompts = [
    'Calculate 18% GST on ₹50,000.',
    'What is your refund policy?',
    'What services does the company offer?',
    'Calculate (12500 - 1500) * 0.12.',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/ai-agents"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  {agent?.status || 'Active'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-mono text-slate-500">{agent?.model}</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {agent?.name || 'AI Agent'} — Tester
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Chat</span>
            </button>

            <Link
              href={`/ai-agents/${agentId}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Configure</span>
            </Link>
          </div>
        </div>

        {/* Two-Column Layout: Agent Config Left, Chat Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Config & Tools Summary */}
          <div className="space-y-4">
            <div className="bg-white border border-[#E6EBF2] rounded-3xl p-5 shadow-subtle space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Agent Specifications
                </h2>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Purpose</span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {agent?.purpose || 'General AI reasoning assistant.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-400 font-semibold">Max Reasoning Steps</span>
                <span className="font-mono font-bold text-slate-900">{agent?.max_steps || 5}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-400 font-semibold">Temperature</span>
                <span className="font-mono font-bold text-slate-900">{agent?.temperature ?? 0.2}</span>
              </div>

              {agent?.chatbot_id && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-semibold block mb-1">Knowledge Source</span>
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Connected Chatbot</span>
                  </div>
                </div>
              )}
            </div>

            {/* Enabled Tools Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-3xl p-5 shadow-subtle space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Permitted Tools ({agent?.tools?.filter((t) => t.enabled).length || 0})
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="space-y-2">
                {agent?.tools && agent.tools.filter((t) => t.enabled).length > 0 ? (
                  agent.tools
                    .filter((t) => t.enabled)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {t.tool_type === 'knowledge_search' ? (
                            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                          ) : t.tool_type === 'calculator' ? (
                            <Calculator className="w-3.5 h-3.5 text-blue-600" />
                          ) : t.tool_type === 'http_request' ? (
                            <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Database className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span className="font-bold text-slate-800">{t.name}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600">Active</span>
                      </div>
                    ))
                ) : (
                  <p className="text-slate-400 italic">No tools enabled for this agent.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Chat Interface */}
          <div className="lg:col-span-2 bg-white border border-[#E6EBF2] rounded-3xl shadow-subtle flex flex-col h-[650px] overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Test {agent?.name || 'Your AI Agent'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Send a message to test how the agent reasons, selects tools, evaluates outputs,
                      and builds verified answers.
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Try Sample Inquiries
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md">
                      {samplePrompts.map((p) => (
                        <button
                          key={p}
                          onClick={() => handleSend(p)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-slate-100 text-slate-900 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>

                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Execution Trace Box for Assistant Turns */}
                  {m.role === 'assistant' && m.steps && m.steps.length > 0 && (
                    <div className="ml-9 mt-2 max-w-[85%] w-full">
                      <button
                        onClick={() =>
                          setExpandedTraceId(expandedTraceId === m.id ? null : m.id)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200/80 transition-colors"
                      >
                        <Code2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Execution Trace ({m.steps.length} {m.steps.length === 1 ? 'step' : 'steps'})</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-slate-400">{m.latency_ms}ms</span>
                        {expandedTraceId === m.id ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                        )}
                      </button>

                      {expandedTraceId === m.id && (
                        <div className="mt-2 p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-3 shadow-md animate-in fade-in">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-bold flex items-center justify-between pb-1 border-b border-slate-800">
                            <span>Step-by-Step Tool Trace</span>
                            <span className="text-emerald-400">Verified Safe</span>
                          </div>

                          {m.steps.map((st) => (
                            <div key={st.step_number} className="space-y-1.5 pl-2 border-l-2 border-blue-500">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-400">
                                  Step {st.step_number}: Tool [{st.tool_name}]
                                </span>
                                <span className="text-slate-400 text-[10px]">{st.latency_ms}ms</span>
                              </div>

                              <div className="text-slate-400">
                                Input: <code className="text-slate-200">{JSON.stringify(st.tool_input)}</code>
                              </div>

                              <div className="text-slate-400">
                                Output: <code className="text-emerald-300">{JSON.stringify(st.tool_output)}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {executing && (
                <div className="flex items-start gap-2.5 max-w-[80%]">
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3.5 bg-slate-100 rounded-2xl rounded-bl-xs text-xs text-slate-600 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                    <span>{activeToolIndicator || 'Autonomous agent reasoning...'}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask a question or request a calculation..."
                  disabled={executing}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={executing || !userInput.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
