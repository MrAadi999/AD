'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig } from '@/lib/chatbot/types';
import {
  BookOpen,
  Globe,
  FileText,
  ExternalLink,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function KnowledgeBasePage() {
  const { workspace, loading: authLoading } = useAuth();
  const [chatbots, setChatbots] = useState<ChatbotConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const wsId = workspace?.id || 'ws-demo-01';
      setLoading(true);
      const bots = await ChatbotService.getChatbots(wsId);
      setChatbots(bots);
      setLoading(false);
    };

    if (!authLoading) {
      loadData();
    }
  }, [workspace?.id, authLoading]);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Knowledge Base
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage website knowledge, crawled documentation, and company facts for{' '}
              <span className="font-semibold text-slate-700">
                {workspace?.name || 'your workspace'}
              </span>
              .
            </p>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[260px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading knowledge base...</span>
            </div>
          </div>
        ) : chatbots.length === 0 ? (
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-12 text-center shadow-subtle max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Knowledge Sources Yet</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Create an AI chatbot and crawl your website to build your knowledge base.
            </p>
            <div className="mt-6">
              <Link
                href="/chatbots/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Bot &amp; Add Website</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chatbots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle hover:border-purple-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs"
                          style={{ backgroundColor: bot.brand_color || '#2563EB' }}
                        >
                          {(bot.name || 'B').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{bot.name}</h3>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {bot.industry || 'Technology'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Website Knowledge
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {bot.website_url ? (
                        <span className="truncate">{bot.website_url}</span>
                      ) : (
                        <span className="text-slate-400 italic">No website configured</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Knowledge Source
                    </span>

                    <Link
                      href={`/chatbots/${bot.id}/knowledge`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500"
                    >
                      <span>View Knowledge</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
