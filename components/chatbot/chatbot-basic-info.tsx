'use client';

import React from 'react';
import { ChatbotConfig, IndustryType, LanguageType } from '@/lib/chatbot/types';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

interface ChatbotBasicInfoProps {
  config: ChatbotConfig;
  errors: Record<string, string>;
  onChange: (field: keyof ChatbotConfig, value: any) => void;
  onBack?: () => void;
  onContinue: () => void;
}

const industries: IndustryType[] = [
  'E-commerce',
  'Education',
  'Healthcare',
  'Finance',
  'Technology',
  'Real Estate',
  'Travel',
  'Restaurant',
  'Agency',
  'Other',
];

const languages: LanguageType[] = [
  'English',
  'Hindi',
  'Hinglish',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Other',
];

export const ChatbotBasicInfo: React.FC<ChatbotBasicInfoProps> = ({
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
          Create your AI assistant
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Give your AI assistant a name and tell us what it should help with.
        </p>
      </div>

      <div className="space-y-4">
        {/* Bot Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Bot Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => {
              onChange('name', e.target.value);
              // sync assistant name by default if empty or matches
              if (!config.assistant_name || config.assistant_name === config.name) {
                onChange('assistant_name', e.target.value);
              }
            }}
            placeholder="e.g. BiharStack Support AI"
            className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
              errors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
            }`}
          />
          {errors.name && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={config.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Describe what this AI assistant should help your customers with. Example: AI assistant for customer support, product questions and lead generation."
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
        </div>

        {/* Industry & Language Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Industry <span className="text-red-500">*</span>
            </label>
            <select
              value={config.industry}
              onChange={(e) => onChange('industry', e.target.value as IndustryType)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            {errors.industry && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.industry}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Language <span className="text-red-500">*</span>
            </label>
            <select
              value={config.language}
              onChange={(e) => onChange('language', e.target.value as LanguageType)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            {errors.language && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.language}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition-all ml-auto"
        >
          <span>Continue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
