'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeveloperNav } from '@/components/developer/DeveloperNav';
import { useAuth } from '@/lib/supabase/auth-context';
import { ApiRequestLogRecord } from '@/lib/developer/types';
import {
  ListFilter,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  FileCode,
  Loader2,
  Activity,
} from 'lucide-react';

export default function ApiLogsPage() {
  const { workspace, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<ApiRequestLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | '2xx' | '4xx' | '5xx'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<ApiRequestLogRecord | null>(null);

  const workspaceId = workspace?.id || 'ws-demo-01';

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/developer/logs?workspace_id=${workspaceId}&limit=100`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch request logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchLogs();
    }
  }, [authLoading, workspaceId]);

  const filteredLogs = logs.filter((log) => {
    // Status filter
    if (filterStatus === '2xx' && (log.status_code < 200 || log.status_code >= 300))
      return false;
    if (filterStatus === '4xx' && (log.status_code < 400 || log.status_code >= 500))
      return false;
    if (filterStatus === '5xx' && log.status_code < 500) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.request_id.toLowerCase().includes(q) ||
        log.path.toLowerCase().includes(q) ||
        (log.chatbot_name && log.chatbot_name.toLowerCase().includes(q))
      );
    }

    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              API Request Logs
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Inspect real-time telemetry, latencies, response status codes, and error diagnostics.
            </p>
          </div>

          <button
            onClick={() => fetchLogs()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <DeveloperNav />

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['all', '2xx', '4xx', '5xx'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg transition-all capitalize ${
                  filterStatus === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Codes' : st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Request ID or path..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Logs Table Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-3xl shadow-subtle overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="min-h-[260px] flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No logs found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No API requests matched your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Time</th>
                    <th className="px-6 py-3.5">Request ID</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Endpoint</th>
                    <th className="px-6 py-3.5">Chatbot</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString('en-US', {
                          hour12: false,
                        })}
                      </td>

                      <td className="px-6 py-3.5 font-mono text-slate-700 font-medium group-hover:text-blue-600 whitespace-nowrap">
                        {log.request_id}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            log.method === 'POST'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {log.method}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 font-mono text-slate-800 font-semibold whitespace-nowrap">
                        {log.path}
                      </td>

                      <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap">
                        {log.chatbot_name || 'System / All Bots'}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            log.status_code >= 200 && log.status_code < 300
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.status_code === 429
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.status_code >= 200 && log.status_code < 300 ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : log.status_code === 429 ? (
                            <Clock className="w-3 h-3 text-purple-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{log.status_code}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right font-mono text-slate-500 whitespace-nowrap">
                        {log.latency_ms}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Request Details Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-left relative overflow-hidden">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedLog.status_code < 400
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Request Telemetry
                </h3>
                <p className="text-xs font-mono text-slate-400">{selectedLog.request_id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-semibold">Endpoint</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedLog.method} {selectedLog.path}
                </span>
              </div>

              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-semibold">HTTP Status</span>
                <span
                  className={`font-mono font-bold ${
                    selectedLog.status_code < 400 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {selectedLog.status_code}
                </span>
              </div>

              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-semibold">Execution Latency</span>
                <span className="font-mono text-slate-800">{selectedLog.latency_ms} ms</span>
              </div>

              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-semibold">Timestamp</span>
                <span className="text-slate-800">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-semibold">Target Chatbot</span>
                <span className="text-slate-800 font-medium">
                  {selectedLog.chatbot_name || 'System / Default'}
                </span>
              </div>

              {selectedLog.error_code && (
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-400 font-semibold">Diagnostic Code</span>
                  <span className="font-mono text-rose-600 font-bold">
                    {selectedLog.error_code}
                  </span>
                </div>
              )}
            </div>

            {/* Privacy Guarantee Note */}
            <div className="mt-5 p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
              🔒 <strong>Privacy Protected:</strong> Raw API secrets, Authorization headers, and
              private user passwords are never stored in request logs.
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
