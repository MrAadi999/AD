'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig } from '@/lib/chatbot/types';
import {
  Plus,
  Bot,
  Edit2,
  Trash2,
  Calendar,
  Globe,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function MyChatbotsPage() {
  const { workspace, loading: authLoading } = useAuth();

  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteCandidate, setDeleteCandidate] = useState<ChatbotConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadChatbots = async () => {
    const wsId = workspace?.id || 'ws-demo-01';
    setLoading(true);
    const data = await ChatbotService.getChatbots(wsId);
    setChatbots(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      loadChatbots();
    }
  }, [workspace?.id, authLoading]);

  const handleDelete = async () => {
    const wsId = workspace?.id || 'ws-demo-01';
    if (!deleteCandidate?.id) return;
    setDeleting(true);
    await ChatbotService.deleteChatbot(wsId, deleteCandidate.id);
    setDeleting(false);
    setDeleteCandidate(null);
    await loadChatbots();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              My Chatbots
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your AI chatbots and assistants configured for{' '}
              <span className="font-semibold text-slate-700">
                {workspace?.name || 'your workspace'}
              </span>
              .
            </p>
          </div>

          <Link
            href="/chatbots/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Bot</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading || authLoading ? (
          <div className="min-h-[260px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading your assistants...</span>
            </div>
          </div>
        ) : chatbots.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-12 text-center shadow-subtle max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No chatbots yet</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Create your first chatbot and turn your website into a 24/7 AI assistant in under 2 minutes.
            </p>
            <div className="mt-6">
              <Link
                href="/chatbots/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Bot</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Real Chatbots List Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {chatbots.map((bot) => {
              const formattedDate = bot.created_at
                ? new Date(bot.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={bot.id}
                  className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle hover:border-blue-300 hover:shadow-card-hover transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Identity & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs"
                          style={{ backgroundColor: bot.brand_color || '#2563EB' }}
                        >
                          {(bot.name || 'B').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 truncate">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {bot.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {bot.language || 'English'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          bot.status === 'live' || bot.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            bot.status === 'live' || bot.status === 'active'
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        {bot.status === 'live' || bot.status === 'active'
                          ? 'Live'
                          : 'Draft'}
                      </span>
                    </div>

                    {/* Website & Created Date */}
                    <div className="space-y-1.5 my-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                        <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <a
                          href={bot.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 truncate"
                        >
                          {bot.website_url}
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Created {formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row: Open, Edit, Delete */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setDeleteCandidate(bot)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Bot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/chatbots/${bot.id}/edit`}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                        <span>Edit</span>
                      </Link>

                      <Link
                        href={`/chatbots/${bot.id}`}
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md shadow-xs transition-colors"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-left space-y-4 animate-in fade-in duration-150">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete &ldquo;{deleteCandidate.name}&rdquo;?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to delete this AI assistant? This action cannot be undone and all configurations will be removed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  disabled={deleting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Bot</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
