'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeveloperNav } from '@/components/developer/DeveloperNav';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig } from '@/lib/chatbot/types';
import {
  Terminal,
  Send,
  Loader2,
  Clock,
  Zap,
  Bot,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

export default function ApiPlaygroundPage() {
  const { workspace, loading: authLoading } = useAuth();
  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [message, setMessage] = useState('What services do you provide?');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const workspaceId = workspace?.id || 'ws-demo-01';

  useEffect(() => {
    const loadBots = async () => {
      const bots = await ChatbotService.getChatbots(workspaceId);
      setChatbots(bots);
      if (bots.length > 0) {
        setSelectedBotId(bots[0].public_id || bots[0].id || '');
      }
    };

    if (!authLoading) {
      loadBots();
    }
  }, [authLoading, workspaceId]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !selectedBotId) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = Date.now();

    try {
      // Use internal chat execution endpoint for user session safely
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_id: selectedBotId,
          message: message.trim(),
        }),
      });

      const json = await res.json();
      const latency = Date.now() - startTime;

      if (!res.ok) {
        throw new Error(json.error?.message || json.error || 'Request failed');
      }

      setResponse({
        id: json.message_id || `msg_${Math.random().toString(36).slice(2, 10)}`,
        object: 'chat.response',
        bot_id: selectedBotId,
        message: json.message,
        sources: json.sources || [],
        usage: {
          input_tokens: Math.ceil(message.length / 4),
          output_tokens: Math.ceil((json.message || '').length / 4),
          total_tokens: Math.ceil((message.length + (json.message || '').length) / 4),
        },
        status_code: res.status,
        latency_ms: latency,
        request_id: `req_${Math.random().toString(36).slice(2, 12)}`,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while executing the API call.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-5xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Developer API Playground
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Test your AI chatbots, evaluate grounded responses, and inspect token telemetry in real time.
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authenticated Workspace Session</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <DeveloperNav />

        {/* Playground Grid: Controls & Response */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Request Form */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Terminal className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Request Configuration</h2>
            </div>

            {/* Chatbot Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Chatbot
              </label>
              {chatbots.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  No chatbots created yet. Create a bot in the dashboard first.
                </div>
              ) : (
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {chatbots.map((b) => (
                    <option key={b.id} value={b.public_id || b.id}>
                      {b.name} ({b.public_id || b.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Message / Question
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a visitor question to test grounded retrieval..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>

            {/* Suggested Prompts */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Sample Questions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What services do you provide?',
                  'Where is your company located?',
                  'What are your pricing plans?',
                  'How do I contact support?',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setMessage(q)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSend()}
              disabled={loading || !selectedBotId || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing RAG Completion...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send API Request</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Response Viewer */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900">API Response</h2>
              </div>

              {response && (
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!response && !error && !loading && (
              <div className="py-20 text-center text-slate-400">
                <Terminal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Playground Ready</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Click &ldquo;Send API Request&rdquo; to test your chatbot and view real-time latency and sources.
                </p>
              </div>
            )}

            {loading && (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span>Querying knowledge vectors & generating response...</span>
              </div>
            )}

            {response && !loading && (
              <div className="space-y-4 text-xs">
                {/* Telemetry Pills */}
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    200 OK
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {response.latency_ms}ms
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1 font-semibold">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {response.usage?.total_tokens} tokens
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 truncate max-w-[150px]">
                    {response.request_id}
                  </span>
                </div>

                {/* Grounded Message Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                    <span>Grounded Answer</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                    {response.message}
                  </p>
                </div>

                {/* Sources Citation */}
                {response.sources && response.sources.length > 0 && (
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Cited Sources
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {response.sources.map((s: any, idx: number) => (
                        <a
                          key={idx}
                          href={s.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold hover:bg-purple-100 transition-colors"
                        >
                          <span>{s.title || 'Knowledge Source'}</span>
                          <ExternalLink className="w-3 h-3 text-purple-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON View */}
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Raw JSON Body
                  </span>
                  <div className="p-3 bg-[#0F172A] text-slate-200 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-48 scrollbar-thin">
                    <pre>
                      <code>{JSON.stringify(response, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
