'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { AgentService } from '@/lib/agents/agent-service';
import { AgentRecord } from '@/lib/agents/types';
import {
  Cpu,
  Plus,
  Play,
  Settings2,
  Copy,
  PauseCircle,
  PlayCircle,
  Trash2,
  BookOpen,
  Calculator,
  Globe,
  Database,
  BarChart3,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function AiAgentsDashboard() {
  const router = useRouter();
  const { workspace, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const workspaceId = workspace?.id || 'ws-demo-01';

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/agents?workspace_id=${workspaceId}`);
      if (res.ok) {
        const json = await res.json();
        setAgents(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchAgents();
    }
  }, [authLoading, workspaceId]);

  const handleToggleStatus = async (agent: AgentRecord) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    setActionLoadingId(agent.id);
    try {
      await fetch(`/api/v1/agents/${agent.id}?workspace_id=${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchAgents();
    } catch (err) {
      console.error('Failed to update agent status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (agentId: string) => {
    setActionLoadingId(agentId);
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/duplicate?workspace_id=${workspaceId}`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchAgents();
      }
    } catch (err) {
      console.error('Failed to duplicate agent:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to archive this AI agent?')) return;
    setActionLoadingId(agentId);
    try {
      await fetch(`/api/v1/agents/${agentId}?workspace_id=${workspaceId}`, {
        method: 'DELETE',
      });
      await fetchAgents();
    } catch (err) {
      console.error('Failed to delete agent:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case 'knowledge_search':
        return <BookOpen className="w-3 h-3 text-purple-600" />;
      case 'calculator':
        return <Calculator className="w-3 h-3 text-blue-600" />;
      case 'http_request':
        return <Globe className="w-3 h-3 text-emerald-600" />;
      case 'configured_api':
        return <Database className="w-3 h-3 text-amber-600" />;
      default:
        return <Cpu className="w-3 h-3 text-slate-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                AI Agents Platform
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">
                Autonomous Reasoning & Tool Execution
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              AI Agents
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Build AI agents that can understand, reason, use tools, search business knowledge,
              and complete business tasks safely.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link
              href="/ai-agents/analytics"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Analytics</span>
            </Link>

            <Link
              href="/ai-agents/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Agent</span>
            </Link>
          </div>
        </div>

        {/* Quick Starter Templates */}
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 border border-blue-200/60 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Agent Templates
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Start with pre-configured reasoning & tools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: 'Customer Support',
                desc: 'Answers questions & calculates order refunds/GST.',
                tools: ['Knowledge', 'Calculator'],
                templateId: 'support',
              },
              {
                title: 'Sales Qualification',
                desc: 'Qualifies prospective buyers and pricing tiers.',
                tools: ['Knowledge Base'],
                templateId: 'sales',
              },
              {
                title: 'Website Researcher',
                desc: 'Fetches approved URLs with SSRF protection.',
                tools: ['HTTP GET', 'Knowledge'],
                templateId: 'research',
              },
              {
                title: 'Custom Business Agent',
                desc: 'Blank canvas with maximum steps & tools.',
                tools: ['All Tools'],
                templateId: 'custom',
              },
            ].map((t) => (
              <Link
                key={t.title}
                href={`/ai-agents/new?template=${t.templateId}`}
                className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-sm transition-all text-left flex flex-col justify-between group"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {t.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{t.desc}</p>
                </div>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {t.tools.map((tool) => (
                      <span
                        key={tool}
                        className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Agents Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              Active Agents ({agents.length})
            </h2>
            <Link
              href="/ai-agents/runs"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Global Execution Trace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="min-h-[280px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : agents.length === 0 ? (
            <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
              <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No AI agents created yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create an AI agent to combine your business knowledge with automated calculation and web tools.
              </p>
              <Link
                href="/ai-agents/new"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Create Your First Agent
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white border border-[#E6EBF2] rounded-3xl p-5 shadow-subtle flex flex-col justify-between hover:border-slate-300 transition-all text-left relative"
                >
                  <div>
                    {/* Status & Model */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          agent.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : agent.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            agent.status === 'active'
                              ? 'bg-emerald-500'
                              : agent.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <span className="capitalize">{agent.status}</span>
                      </span>

                      <span className="text-[11px] font-mono text-slate-400">
                        {agent.model}
                      </span>
                    </div>

                    {/* Agent Title & Description */}
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {agent.purpose || agent.description || 'General business agent.'}
                    </p>

                    {/* Enabled Tools */}
                    <div className="mt-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Enabled Tools ({agent.tools?.filter((t) => t.enabled).length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.tools && agent.tools.filter((t) => t.enabled).length > 0 ? (
                          agent.tools
                            .filter((t) => t.enabled)
                            .map((tool) => (
                              <span
                                key={tool.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] font-medium text-slate-700"
                              >
                                {getToolIcon(tool.tool_type)}
                                <span>{tool.name}</span>
                              </span>
                            ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No tools enabled</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/ai-agents/${agent.id}/test`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Open Tester</span>
                    </Link>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(agent)}
                        title={agent.status === 'active' ? 'Pause Agent' : 'Activate Agent'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {agent.status === 'active' ? (
                          <PauseCircle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <PlayCircle className="w-4 h-4 text-emerald-500" />
                        )}
                      </button>

                      <Link
                        href={`/ai-agents/${agent.id}/edit`}
                        title="Edit Configuration"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleDuplicate(agent.id)}
                        title="Duplicate Agent"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(agent.id)}
                        title="Archive Agent"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
