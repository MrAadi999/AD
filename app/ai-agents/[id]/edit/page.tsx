'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { AgentRecord, AgentToolRecord, ToolType } from '@/lib/agents/types';
import {
  ArrowLeft,
  Cpu,
  BookOpen,
  Calculator,
  Globe,
  Database,
  Sliders,
  Check,
  Loader2,
  Trash2,
} from 'lucide-react';

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { workspace, loading: authLoading } = useAuth();

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedChatbotId, setSelectedChatbotId] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [maxSteps, setMaxSteps] = useState(5);
  const [status, setStatus] = useState<'active' | 'paused' | 'draft'>('active');

  // Tools
  const [tools, setTools] = useState<AgentToolRecord[]>([]);

  const workspaceId = workspace?.id || 'ws-demo-01';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [agentRes, botsRes] = await Promise.all([
          fetch(`/api/v1/agents/${agentId}?workspace_id=${workspaceId}`),
          ChatbotService.getChatbots(workspaceId),
        ]);

        if (agentRes.ok) {
          const json = await agentRes.json();
          const ag: AgentRecord = json.data;
          setAgent(ag);
          setName(ag.name);
          setPurpose(ag.purpose);
          setDescription(ag.description || '');
          setInstructions(ag.system_instructions);
          setSelectedChatbotId(ag.chatbot_id || '');
          setModel(ag.model);
          setTemperature(ag.temperature);
          setMaxSteps(ag.max_steps);
          setStatus(ag.status as any);
          setTools(ag.tools || []);
        }

        setChatbots(botsRes);
      } catch (err: any) {
        setError('Failed to load agent configuration');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && agentId) {
      loadData();
    }
  }, [authLoading, agentId, workspaceId]);

  const toggleTool = (toolType: ToolType) => {
    setTools((prev) => {
      const existing = prev.find((t) => t.tool_type === toolType);
      if (existing) {
        return prev.map((t) => (t.tool_type === toolType ? { ...t, enabled: !t.enabled } : t));
      } else {
        return [
          ...prev,
          {
            id: `temp_${Date.now()}`,
            workspace_id: workspaceId,
            agent_id: agentId,
            tool_type: toolType,
            name: toolType === 'knowledge_search' ? 'Knowledge Search' : toolType === 'calculator' ? 'Safe Calculator' : toolType === 'http_request' ? 'HTTP Request' : 'Configured API',
            description: `Tool for ${toolType}`,
            configuration: {},
            enabled: true,
            created_at: new Date().toISOString(),
          },
        ];
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/v1/agents/${agentId}?workspace_id=${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          purpose: purpose.trim(),
          description: description.trim() || undefined,
          system_instructions: instructions.trim(),
          chatbot_id: selectedChatbotId || null,
          model,
          temperature,
          max_steps: maxSteps,
          status,
          tools,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update agent');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  const isToolEnabled = (tType: ToolType) => {
    return tools.some((t) => t.tool_type === tType && t.enabled);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/ai-agents"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Configure {agent?.name || 'Agent'}
              </h1>
              <p className="text-xs text-slate-500">
                Update system instructions, model parameters, and allowed tool permissions.
              </p>
            </div>
          </div>

          <Link
            href={`/ai-agents/${agentId}/test`}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors"
          >
            Open Tester →
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Agent configuration updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* General */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              General Settings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Agent Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="active">Active (Available for execution)</option>
                  <option value="paused">Paused (Temporarily halted)</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Core Purpose</label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              System Instructions
            </h2>
            <textarea
              rows={5}
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed resize-none"
            />
          </div>

          {/* Model & Limits */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Reasoning & Knowledge
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Max Steps</label>
                <select
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value={3}>3 Steps</option>
                  <option value={5}>5 Steps</option>
                  <option value={8}>8 Steps</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Knowledge Source
                </label>
                <select
                  value={selectedChatbotId}
                  onChange={(e) => setSelectedChatbotId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="">None (General Agent)</option>
                  {chatbots.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="bg-white border border-[#E6EBF2] rounded-3xl p-6 shadow-subtle space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Tool Permissions
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'knowledge_search' as const, label: 'Knowledge Base Search', icon: BookOpen },
                { type: 'calculator' as const, label: 'Safe Calculator', icon: Calculator },
                { type: 'http_request' as const, label: 'Controlled HTTP GET', icon: Globe },
                { type: 'configured_api' as const, label: 'Configured API Tool', icon: Database },
              ].map((t) => {
                const enabled = isToolEnabled(t.type);
                const Icon = t.icon;
                return (
                  <div
                    key={t.type}
                    onClick={() => toggleTool(t.type)}
                    className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      enabled
                        ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{t.label}</span>
                    </div>

                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        enabled ? 'bg-blue-600 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {enabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3">
            <Link
              href="/ai-agents"
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
