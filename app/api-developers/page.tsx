'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeveloperNav } from '@/components/developer/DeveloperNav';
import { CreateKeyModal } from '@/components/developer/CreateKeyModal';
import { CodeBlock } from '@/components/developer/CodeBlock';
import { useAuth } from '@/lib/supabase/auth-context';
import { ApiKeyRecord, ApiRequestLogRecord, UsageSummary } from '@/lib/developer/types';
import {
  Activity,
  Zap,
  AlertCircle,
  Clock,
  KeyRound,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Loader2,
  Lock,
  Layers,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

export default function ApiDevelopersDashboard() {
  const { workspace, loading: authLoading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d'>('7d');
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [logs, setLogs] = useState<ApiRequestLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const workspaceId = workspace?.id || 'ws-demo-01';

  const loadData = async () => {
    try {
      setLoading(true);
      const [usageRes, keysRes, logsRes] = await Promise.all([
        fetch(`/api/v1/developer/usage?workspace_id=${workspaceId}&timeframe=${timeframe}`),
        fetch(`/api/v1/developer/keys?workspace_id=${workspaceId}`),
        fetch(`/api/v1/developer/logs?workspace_id=${workspaceId}&limit=5`),
      ]);

      if (usageRes.ok) {
        const u = await usageRes.json();
        setUsage(u.data);
      }
      if (keysRes.ok) {
        const k = await keysRes.json();
        setKeys(k.data || []);
      }
      if (logsRes.ok) {
        const l = await logsRes.json();
        setLogs(l.data || []);
      }
    } catch (err) {
      console.error('Failed to load developer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, workspaceId, timeframe]);

  const quickStartSnippet = [
    {
      label: 'cURL',
      language: 'bash',
      code: `curl https://api.biharstack.ai/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bot_id": "bs_bot_xxxxxxxxx",
    "message": "What services do you provide?"
  }'`,
    },
    {
      label: 'JavaScript',
      language: 'javascript',
      code: `const response = await fetch("https://api.biharstack.ai/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    bot_id: "bs_bot_xxxxxxxxx",
    message: "What services do you provide?"
  })
});

const data = await response.json();
console.log(data.message);`,
    },
    {
      label: 'Python',
      language: 'python',
      code: `import requests

response = requests.post(
    "https://api.biharstack.ai/v1/chat",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "bot_id": "bs_bot_xxxxxxxxx",
        "message": "What services do you provide?"
    }
)

print(response.json()["message"])`,
    },
  ];

  const formatTokens = (toks: number) => {
    if (toks >= 1_000_000) return `${(toks / 1_000_000).toFixed(1)}M`;
    if (toks >= 1_000) return `${(toks / 1_000).toFixed(1)}K`;
    return toks.toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                v1 REST API
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Systems Operational
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              API & Developers
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Connect your applications, websites, and internal tools directly to your AI chatbots
              using enterprise-grade REST APIs.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Create API Key</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <DeveloperNav onCreateKey={() => setModalOpen(true)} />

        {/* Quick Start Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Quick Start</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Send your first chat completion using the Chat API endpoint:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
                POST /v1/chat
              </span>
              <Link
                href="/api-developers/docs"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Full Docs</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <CodeBlock snippets={quickStartSnippet} title="Chat Endpoint" />
        </div>

        {/* Usage Telemetry Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">API Usage & Telemetry</h2>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeframe === 'today'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeframe('7d')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeframe === '7d'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeframe('30d')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeframe === '30d'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Requests</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : (usage?.total_requests || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {usage?.successful_requests || 0} successful calls
              </p>
            </div>

            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tokens Used</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : formatTokens(usage?.tokens_used || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Input & Output tokens</p>
            </div>

            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Avg Latency</span>
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading
                  ? '...'
                  : `${((usage?.avg_latency_ms || 840) / 1000).toFixed(2)}s`}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">End-to-end RAG latency</p>
            </div>

            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Errors / 429</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {loading ? '...' : usage?.failed_requests || 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {usage?.rate_limited_count || 0} rate-limit events
              </p>
            </div>
          </div>

          {/* Simple Sparkline / Bar Chart */}
          {usage?.time_series && usage.time_series.length > 0 && (
            <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Requests Over Time
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {usage.time_series.length} data points
                </span>
              </div>

              <div className="h-40 flex items-end gap-2 pt-6 pb-2">
                {(() => {
                  const maxReq = Math.max(
                    ...usage.time_series.map((p) => p.requests),
                    1
                  );
                  return usage.time_series.map((point, idx) => {
                    const heightPct = Math.round((point.requests / maxReq) * 100);
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1.5 group relative"
                      >
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                          {point.requests} reqs ({formatTokens(point.tokens)} tokens)
                        </div>

                        <div className="w-full bg-slate-100 rounded-t-lg h-32 flex items-end overflow-hidden">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg transition-all group-hover:opacity-80"
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 truncate w-full text-center">
                          {point.timestamp}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Two-Column Grid: Keys Preview & Recent Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active API Keys Card */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">API Keys</h3>
                </div>
                <Link
                  href="/api-developers/keys"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Manage Keys</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {keys.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                  <KeyRound className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-semibold">No API keys created yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generate an API key to authenticate your server requests.
                  </p>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    + Create Key
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.slice(0, 3).map((k) => (
                    <div
                      key={k.id}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{k.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              k.environment === 'live'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {k.environment}
                          </span>
                          {k.revoked_at && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              revoked
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-500 mt-1">
                          {k.key_prefix}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">
                          {k.last_used_at
                            ? `Used ${new Date(k.last_used_at).toLocaleDateString()}`
                            : 'Never used'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Raw keys hashed using SHA-256
              </span>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                + New Key
              </button>
            </div>
          </div>

          {/* Recent API Requests Card */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">Recent API Requests</h3>
                </div>
                <Link
                  href="/api-developers/logs"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>View All Logs</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {logs.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                  <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-semibold">No API requests recorded</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Send a request using cURL or the playground to see live logs.
                  </p>
                  <Link
                    href="/api-developers/playground"
                    className="inline-block mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Open Playground
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            log.method === 'POST'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="font-mono text-slate-800">{log.path}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-400">
                          {log.latency_ms}ms
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            log.status_code >= 200 && log.status_code < 300
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status_code === 429
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.status_code}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">Auto-refreshes on every request</span>
              <Link
                href="/api-developers/playground"
                className="text-xs font-bold text-purple-600 hover:text-purple-700"
              >
                Test in Playground →
              </Link>
            </div>
          </div>
        </div>

        {/* Documentation Quick Links Grid */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Developer Documentation
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Explore guides, parameter specifications, error codes, and multi-language SDK examples.
              </p>
            </div>
            <Link
              href="/api-developers/docs"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition-colors self-start sm:self-auto"
            >
              Browse Full Docs →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                title: 'Authentication',
                desc: 'Bearer tokens, live & test keys',
                href: '/api-developers/docs#authentication',
              },
              {
                title: 'Chat API',
                desc: 'POST /v1/chat grounded answers',
                href: '/api-developers/docs#chat-api',
              },
              {
                title: 'Error Handling',
                desc: 'Status codes & troubleshooting',
                href: '/api-developers/docs#errors',
              },
              {
                title: 'Rate Limits',
                desc: '100 req/min limits & headers',
                href: '/api-developers/docs#rate-limits',
              },
            ].map((d) => (
              <Link
                key={d.title}
                href={d.href}
                className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
              >
                <div className="text-xs font-bold text-white mb-1">{d.title}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{d.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <CreateKeyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => loadData()}
        workspaceId={workspaceId}
      />
    </DashboardLayout>
  );
}
