'use client';

import React, { useRef } from 'react';
import {
  ChatbotConfig,
  ToneType,
  ResponseStyleType,
  AvatarType,
} from '@/lib/chatbot/types';
import { ArrowLeft, ArrowRight, Bot, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';

interface ChatbotCustomizationProps {
  config: ChatbotConfig;
  errors: Record<string, string>;
  onChange: (field: keyof ChatbotConfig, value: any) => void;
  onBack: () => void;
  onContinue: () => void;
}

const tones: ToneType[] = ['Friendly', 'Professional', 'Helpful', 'Casual', 'Formal'];
const styles: ResponseStyleType[] = ['Concise', 'Balanced', 'Detailed'];
const presetColors = [
  { name: 'Electric Blue', hex: '#2563EB' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Dark Slate', hex: '#0F172A' },
];

export const ChatbotCustomization: React.FC<ChatbotCustomizationProps> = ({
  config,
  errors,
  onChange,
  onBack,
  onContinue,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange('avatar_url', reader.result as string);
        onChange('avatar_type', 'upload');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 shadow-subtle text-left space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Customize your AI assistant
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Give your assistant a personality that matches your brand.
        </p>
      </div>

      <div className="space-y-5">
        {/* Assistant Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Assistant Name
          </label>
          <input
            type="text"
            value={config.assistant_name}
            onChange={(e) => onChange('assistant_name', e.target.value)}
            placeholder="e.g. BiharStack Support AI"
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Welcome Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Welcome Message <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            value={config.welcome_message}
            onChange={(e) => onChange('welcome_message', e.target.value)}
            placeholder="Write your welcome message..."
            className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none ${
              errors.welcome_message ? 'border-red-400 bg-red-50/30' : 'border-slate-200'
            }`}
          />
          {errors.welcome_message && (
            <p className="text-[11px] text-red-600 mt-1">{errors.welcome_message}</p>
          )}
        </div>

        {/* Tone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Tone
          </label>
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange('tone', t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  config.tone === t
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Response Style */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Response Style
          </label>
          <div className="flex flex-wrap gap-2">
            {styles.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange('response_style', s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  config.response_style === s
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Enable Lead Collection */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Enable Lead Collection
              </span>
              <span className="text-[11px] text-slate-500">
                Collect visitor contact information before or during conversations.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange('lead_collection_enabled', !config.lead_collection_enabled)
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                config.lead_collection_enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  config.lead_collection_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {config.lead_collection_enabled && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-5 text-xs font-medium text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.lead_fields.name}
                  onChange={(e) =>
                    onChange('lead_fields', {
                      ...config.lead_fields,
                      name: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Name</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.lead_fields.email}
                  onChange={(e) =>
                    onChange('lead_fields', {
                      ...config.lead_fields,
                      email: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Email</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.lead_fields.phone}
                  onChange={(e) =>
                    onChange('lead_fields', {
                      ...config.lead_fields,
                      phone: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Phone</span>
              </label>
            </div>
          )}
        </div>

        {/* Primary and Secondary CTA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary CTA
            </label>
            <input
              type="text"
              value={config.primary_cta}
              onChange={(e) => onChange('primary_cta', e.target.value)}
              placeholder="Talk to us"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Secondary CTA
            </label>
            <input
              type="text"
              value={config.secondary_cta}
              onChange={(e) => onChange('secondary_cta', e.target.value)}
              placeholder="Contact support"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>
        </div>

        {/* Bot Avatar & Branding Section */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-900">
            Bot Avatar
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onChange('avatar_type', 'upload')}
              className={`p-2.5 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                config.avatar_type === 'upload'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-2xs'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <Upload className="w-4 h-4 text-purple-600" />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="underline text-[10px] text-blue-600 hover:text-blue-700"
                >
                  Choose
                </span>
              </div>
              <span>Upload Image</span>
            </button>

            <button
              type="button"
              onClick={() => onChange('avatar_type', 'initial')}
              className={`p-2.5 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                config.avatar_type === 'initial'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-2xs'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span
                className="w-4 h-4 rounded-sm text-white font-bold flex items-center justify-center text-[10px]"
                style={{ backgroundColor: config.brand_color || '#2563EB' }}
              >
                {(config.assistant_name || config.name || 'B').charAt(0).toUpperCase()}
              </span>
              <span>Use Initial</span>
            </button>

            <button
              type="button"
              onClick={() => onChange('avatar_type', 'default_icon')}
              className={`p-2.5 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                config.avatar_type === 'default_icon'
                  ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-2xs'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Bot className="w-4 h-4 text-blue-600" />
              <span>Default AI Icon</span>
            </button>
          </div>

          {/* Primary Brand Color */}
          <div className="pt-2">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Brand Color (Default: Electric Blue)
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {presetColors.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    title={color.name}
                    onClick={() => onChange('brand_color', color.hex)}
                    style={{ backgroundColor: color.hex }}
                    className={`w-7 h-7 rounded-lg transition-transform ${
                      config.brand_color === color.hex
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                        : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>

              {/* Color picker input */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.brand_color || '#2563EB'}
                  onChange={(e) => onChange('brand_color', e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                  title="Pick custom color"
                />
                <input
                  type="text"
                  value={config.brand_color}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange('brand_color', val);
                  }}
                  placeholder="#2563EB"
                  className="w-24 text-xs font-mono px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center"
                />
              </div>
            </div>
            {errors.brand_color && (
              <p className="text-[11px] text-red-600 mt-1">{errors.brand_color}</p>
            )}
          </div>
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
