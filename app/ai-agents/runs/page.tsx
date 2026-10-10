'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { AgentRunRecord, AgentStepTrace } from '@/lib/agents/types';
import {
  ArrowLeft,
  Activity,
  Cpu,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  X,
  FileCode,
  Loader2,
  ChevronRight,
  Code2,
} from 'lucide-react';

export default function GlobalAgentRunsPage() {
  const { workspace, loading: authLoading } = useAuth();
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<AgentRunRecord | null>(null);

  const workspaceId = workspace?.id || 'ws-demo-01';

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/agents?workspace_id=${workspaceId}`);
        if (res.ok) {
          const agentsJson = await res.json();
          const allRuns: AgentRunRecord[] = [];
          for (const a of agentsJson.data || []) {
            const runRes = await fetch(`/api/v1/agents/${a.id}/runs?workspace_id=${workspaceId}`);
            if (runRes.ok) {
              const rJson = await runRes.json();
              allRuns.push(...(rJson.data || []));
            }
          }
          allRuns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setRuns(allRuns);
        }
      } catch (err) {
        console.error('Failed to load global runs:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchRuns();
    }
  }, [authLoading, workspaceId]);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-16">
        <div className="flex items-center gap-3">
          <Link
            href="/ai-agents"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Global Agent Execution History
            </h1>
            <p className="text-xs text-slate-500">
              Audit autonomous reasoning decisions, tool executions, and timing telemetry across all workspace agents.
            </p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-3xl shadow-subtle overflow-hidden">
          {loading ? (
            <div className="min-h-[260px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : runs.length === 0 ? (
            <div className="py-20 text-center">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No agent runs recorded yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Execute an inquiry in the Agent Tester or via the API to inspect real-time execution traces.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Time</th>
                    <th className="px-6 py-3.5">Agent</th>
                    <th className="px-6 py-3.5">User Prompt</th>
                    <th className="px-6 py-3.5">Tool Calls</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRun(r)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </td>

                      <td className="px-6 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {r.agent_name || 'AI Agent'}
                      </td>

                      <td className="px-6 py-3.5 text-slate-700 font-medium max-w-xs truncate">
                        {r.input}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                          {r.tool_calls_count} {r.tool_calls_count === 1 ? 'call' : 'calls'}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span className="capitalize">{r.status}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right font-mono text-slate-500 whitespace-nowrap">
                        {r.latency_ms}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Trace Modal */}
        {selectedRun && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 text-left relative overflow-hidden">
              <button
                onClick={() => setSelectedRun(null)}
                className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Execution Trace Details
                  </h3>
                  <p className="text-xs font-mono text-slate-400">{selectedRun.id}</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">User Input</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-900 font-medium">
                    {selectedRun.input}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">Agent Final Output</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-900 leading-relaxed font-sans">
                    {selectedRun.output}
                  </p>
                </div>

                {selectedRun.steps && selectedRun.steps.length > 0 && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-2">
                      Multi-Step Tool Trace ({selectedRun.steps.length} steps)
                    </span>
                    <div className="space-y-2 p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-2xl max-h-56 overflow-y-auto">
                      {selectedRun.steps.map((st) => (
                        <div key={st.step_number} className="pl-2 border-l-2 border-blue-500 py-1">
                          <div className="text-blue-400 font-bold">
                            Step {st.step_number}: [{st.tool_name}]
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
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSelectedRun(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
