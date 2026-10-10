'use client';

import React from 'react';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { ArrowLeft, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface ChatbotReviewProps {
  config: ChatbotConfig;
  saving: boolean;
  isCreated?: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export const ChatbotReview: React.FC<ChatbotReviewProps> = ({
  config,
  saving,
  isCreated = false,
  onBack,
  onSubmit,
}) => {
  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 shadow-subtle text-left space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Review your AI assistant
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review your configuration before saving it to your workspace.
        </p>
      </div>

      {/* Clean Summary Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4">
        {/* Top Identity & Status */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-xs"
              style={{ backgroundColor: config.brand_color || '#2563EB' }}
            >
              {(config.name || 'B').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">{config.name}</h3>
              <p className="text-[11px] text-slate-400">{config.website_url}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Initial Status: Draft
          </span>
        </div>

        {/* 9 Summary Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Bot Name</span>
            <span className="font-semibold text-slate-800">{config.name}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Website</span>
            <span className="font-semibold text-slate-800 truncate block">
              {config.website_url}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Industry</span>
            <span className="font-semibold text-slate-800">{config.industry}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Language</span>
            <span className="font-semibold text-slate-800">{config.language}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Tone</span>
            <span className="font-semibold text-slate-800">{config.tone}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Response Style</span>
            <span className="font-semibold text-slate-800">{config.response_style}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Lead Collection</span>
            <span className="font-semibold text-slate-800">
              {config.lead_collection_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Brand Color</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                style={{ backgroundColor: config.brand_color || '#2563EB' }}
              />
              <span className="font-mono text-slate-700 text-[11px]">
                {config.brand_color || '#2563EB'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Assistant Name</span>
            <span className="font-semibold text-slate-800">
              {config.assistant_name || config.name}
            </span>
          </div>
        </div>

        {config.description && (
          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-[11px] text-slate-400 block font-medium">Description</span>
            <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{config.description}</p>
          </div>
        )}
      </div>

      {/* Multi-tenant Workspace security notice */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>
          This chatbot is saved securely in your authenticated workspace with tenant isolation.
        </span>
      </div>

      {/* Buttons: Back and Create AI Assistant */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={saving || isCreated}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || isCreated}
          className={`inline-flex items-center gap-2 px-6 py-2.5 text-white text-xs font-semibold rounded-lg shadow-md transition-all ${
            isCreated
              ? 'bg-emerald-600 shadow-emerald-500/30'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30 disabled:opacity-60'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Creating...</span>
            </>
          ) : isCreated ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Created ✓</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create AI Assistant</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
