'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { AgentAnalyticsSummary } from '@/lib/agents/types';
import {
  BarChart3,
  ArrowLeft,
  Activity,
  Cpu,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Wrench,
} from 'lucide-react';

export default function AgentAnalyticsPage() {
  const { workspace, loading: authLoading } = useAuth();
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d'>('7d');
  const [analytics, setAnalytics] = useState<AgentAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const workspaceId = workspace?.id || 'ws-demo-01';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/agents/analytics?workspace_id=${workspaceId}&timeframe=${timeframe}`);
        if (res.ok) {
          const json = await res.json();
          setAnalytics(json.data);
        }
      } catch (err) {
        console.error('Failed to load agent analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchAnalytics();
    }
  }, [authLoading, workspaceId, timeframe]);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/ai-agents"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                AI Agents Analytics
              </h1>
              <p className="text-xs text-slate-500">
                Monitor agent reasoning runs, tool call volumes, token usage, and latency.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === '7d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === '30d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Runs</span>
              <Cpu className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '...' : analytics?.total_runs.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {analytics?.successful_runs || 0} completed successfully
            </p>
          </div>

          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Tool Calls</span>
              <Wrench className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '...' : analytics?.total_tool_calls.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Calculations & Knowledge</p>
          </div>

          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Avg Latency</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '...' : `${((analytics?.avg_latency_ms || 800) / 1000).toFixed(2)}s`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Multi-step execution time</p>
          </div>

          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Tokens Consumed</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '...' : `${((analytics?.total_tokens || 0) / 1000).toFixed(1)}K`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Reasoning & tool tokens</p>
          </div>
        </div>

        {/* Chart */}
        {analytics?.time_series && (
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Agent Runs & Tool Calls Over Time</h3>
                <p className="text-xs text-slate-500">Autonomous multi-step completions</p>
              </div>
            </div>

            <div className="h-44 flex items-end gap-3 pt-6 pb-2">
              {(() => {
                const maxVal = Math.max(...analytics.time_series.map((p) => p.runs), 1);
                return analytics.time_series.map((point, idx) => {
                  const heightPct = Math.round((point.runs / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                        {point.runs} runs ({point.tool_calls} tool calls)
                      </div>

                      <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-gradient-to-t from-purple-600 to-blue-500 rounded-t-lg transition-all"
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
    </DashboardLayout>
  );
}
