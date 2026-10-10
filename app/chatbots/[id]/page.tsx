'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig } from '@/lib/chatbot/types';
import {
  ArrowLeft,
  Globe,
  Settings2,
  Code2,
  CheckCircle2,
  Loader2,
  ExternalLink,
  BookOpen,
  AlertCircle,
  Sparkles,
  Bot,
  MessageSquare,
} from 'lucide-react';

export default function ChatbotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { workspace } = useAuth();
  const botId = params?.id as string;

  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingCrawl, setStartingCrawl] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);

  useEffect(() => {
    const loadBot = async () => {
      const wsId = workspace?.id || 'ws-demo-01';
      if (!botId) return;
      setLoading(true);
      const data = await ChatbotService.getChatbotById(wsId, botId);
      setChatbot(data);
      setLoading(false);
    };

    loadBot();
  }, [workspace?.id, botId]);

  const handleStartCrawl = async () => {
    setCrawlError(null);

    // If website URL is not yet connected, take the user directly to the Knowledge Teaching Studio
    if (!chatbot?.website_url || !chatbot.website_url.trim()) {
      router.push(`/chatbots/${botId}/knowledge?teach=true`);
      return;
    }

    setStartingCrawl(true);

    try {
      const res = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbot_id: botId }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        // If crawl failed to start, redirect to knowledge teaching studio
        router.push(`/chatbots/${botId}/knowledge?teach=true`);
        return;
      }

      // Navigate to /chatbots/[id]/knowledge to view real-time crawl progress
      router.push(`/chatbots/${botId}/knowledge`);
    } catch {
      router.push(`/chatbots/${botId}/knowledge?teach=true`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading chatbot configuration...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!chatbot) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center text-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              Chatbot not found in this workspace.
            </p>
            <Link
              href="/my-chatbots"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Chatbots</span>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Extract clean domain for display
  let cleanDomain = chatbot.website_url || 'No website connected';
  if (chatbot.website_url) {
    try {
      cleanDomain = new URL(chatbot.website_url).hostname;
    } catch {
      cleanDomain = chatbot.website_url.replace(/^https?:\/\//i, '');
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href="/my-chatbots"
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            My Chatbots
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{chatbot.name}</span>
        </div>

        {crawlError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{crawlError}</span>
            </div>
            {!chatbot.website_url && (
              <Link
                href={`/chatbots/${chatbot.id}/edit`}
                className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-semibold hover:bg-red-500 transition-colors"
              >
                Add Website
              </Link>
            )}
          </div>
        )}

        {/* Hero Success Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl text-white font-extrabold text-lg flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
              >
                {(chatbot.name || 'B').charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {chatbot.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Draft
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {chatbot.website_url ? (
                    <a
                      href={chatbot.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                      <span>{cleanDomain}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">No website connected</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href={`/chatbots/${chatbot.id}/test`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-emerald-500/30 transition-all"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Test Chatbot</span>
              </Link>

              <button
                onClick={handleStartCrawl}
                disabled={startingCrawl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/30 transition-all disabled:opacity-60"
              >
                {startingCrawl ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Initiating Crawl...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Teach Your AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Four Major Next Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Teach Your AI */}
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle flex flex-col justify-between hover:border-purple-200 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 1</h3>
              <p className="text-sm font-bold text-slate-900 mt-1">Teach Your AI</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Crawl website pages to extract and embed knowledge.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/chatbots/${chatbot.id}/knowledge`}
                className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors text-center"
              >
                <span>View Knowledge</span>
              </Link>
            </div>
          </div>

          {/* Action 2: Test AI Chatbot */}
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 2</h3>
              <p className="text-sm font-bold text-slate-900 mt-1">Test AI Chat</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Ask questions to preview grounded answers with source citations.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/chatbots/${chatbot.id}/test`}
                className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors text-center"
              >
                <span>Open Test Chat</span>
              </Link>
            </div>
          </div>

          {/* Action 3: Customize */}
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle flex flex-col justify-between hover:border-blue-200 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Settings2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 3</h3>
              <p className="text-sm font-bold text-slate-900 mt-1">Customize</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Adjust bot personality, response tone, greeting, and brand styling.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href={`/chatbots/${chatbot.id}/edit`}
                className="w-full inline-flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-center"
              >
                Customize
              </Link>
            </div>
          </div>

          {/* Action 4: Deploy */}
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle flex flex-col justify-between hover:border-slate-300 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Step 4</h3>
              <p className="text-sm font-bold text-slate-900 mt-1">Deploy</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Add JavaScript embed to WordPress, Shopify, Next.js, or HTML.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                href={`/chatbots/${chatbot.id}/deploy`}
                className="w-full inline-flex items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors text-center"
              >
                Get Embed Code
              </Link>
            </div>
          </div>
        </div>

        {/* Configuration Snapshot Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assistant Snapshot
            </h3>
            <Link
              href={`/chatbots/${chatbot.id}/knowledge`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1"
            >
              <span>View Extracted Knowledge</span>
              <span>&rarr;</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <span className="text-slate-400 text-[11px] block">Language</span>
              <span className="font-semibold text-slate-800">{chatbot.language}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Industry</span>
              <span className="font-semibold text-slate-800">{chatbot.industry}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Tone</span>
              <span className="font-semibold text-slate-800">{chatbot.tone}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Lead Capture</span>
              <span className="font-semibold text-slate-800">
                {chatbot.lead_collection_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
