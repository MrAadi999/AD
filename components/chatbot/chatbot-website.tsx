'use client';

import React from 'react';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { ArrowLeft, ArrowRight, Globe, AlertCircle, Info } from 'lucide-react';

interface ChatbotWebsiteProps {
  config: ChatbotConfig;
  errors: Record<string, string>;
  onChange: (field: keyof ChatbotConfig, value: any) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const ChatbotWebsite: React.FC<ChatbotWebsiteProps> = ({
  config,
  errors,
  onChange,
  onBack,
  onContinue,
}) => {
  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 shadow-subtle text-left space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Connect your website
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Your website will become the primary knowledge source for your AI assistant.
        </p>
      </div>

      <div className="space-y-4">
        {/* Website URL Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Website URL <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="url"
              value={config.website_url}
              onChange={(e) => onChange('website_url', e.target.value)}
              placeholder="https://example.com"
              className={`w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                errors.website_url ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
              }`}
            />
          </div>

          {errors.website_url ? (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.website_url}</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">
              Example: <span className="text-slate-600 font-medium">https://biharstack.com</span>
            </p>
          )}
        </div>

        {/* Explanation */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed">
            We’ll use your website content to teach your AI assistant about your business.
          </p>
        </div>

        {/* Ownership Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.website_confirmed}
              onChange={(e) => onChange('website_confirmed', e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs text-slate-700 font-medium leading-relaxed">
              I confirm that I own or have permission to use this website.
            </span>
          </label>

          {errors.website_confirmed && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.website_confirmed}</span>
            </p>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition-all"
        >
          <span>Continue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
