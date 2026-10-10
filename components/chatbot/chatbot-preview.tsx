'use client';

import React from 'react';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { Send, MoreHorizontal, Sparkles, Bot, ImageIcon } from 'lucide-react';

interface ChatbotPreviewProps {
  config: ChatbotConfig;
}

export const ChatbotPreview: React.FC<ChatbotPreviewProps> = ({ config }) => {
  const brandColor = config.brand_color || '#2563EB';
  const botTitle = config.assistant_name || config.name || 'BiharStack AI';
  const welcomeText =
    config.welcome_message || 'Hi! 👋\nHow can I help you today?';

  const renderAvatar = (size = 'w-7 h-7 text-xs') => {
    if (config.avatar_type === 'upload' && config.avatar_url) {
      return (
        <img
          src={config.avatar_url}
          alt={botTitle}
          className={`${size} rounded-lg object-cover flex-shrink-0 shadow-xs ring-1 ring-black/5`}
        />
      );
    }

    if (config.avatar_type === 'initial') {
      return (
        <div
          className={`${size} rounded-lg text-white font-bold flex items-center justify-center flex-shrink-0 shadow-xs`}
          style={{ backgroundColor: brandColor }}
        >
          {(botTitle || 'B').charAt(0).toUpperCase()}
        </div>
      );
    }

    if (config.avatar_type === 'upload') {
      return (
        <div
          className={`${size} rounded-lg text-white flex items-center justify-center flex-shrink-0 shadow-xs`}
          style={{ backgroundColor: brandColor }}
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </div>
      );
    }

    // default_icon
    return (
      <div
        className={`${size} rounded-lg text-white flex items-center justify-center flex-shrink-0 shadow-xs`}
        style={{ backgroundColor: brandColor }}
      >
        <Bot className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="sticky top-6 bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle flex flex-col text-left">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Live Chatbot Preview
        </span>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Real-time
        </span>
      </div>

      {/* Widget Container matching the spec */}
      <div className="w-full max-w-[320px] mx-auto rounded-2xl border border-slate-200 overflow-hidden shadow-md flex flex-col bg-slate-50 text-slate-800">
        {/* Widget Top Header: Name + ••• */}
        <div
          className="p-3.5 text-white flex items-center justify-between transition-colors"
          style={{ backgroundColor: brandColor }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {renderAvatar('w-6 h-6 text-[10px]')}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold leading-tight truncate max-w-[170px]">
                {botTitle}
              </span>
              <span className="text-[9px] text-white/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Online
              </span>
            </div>
          </div>
          <button type="button" className="text-white/80 hover:text-white p-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages Body */}
        <div className="p-3.5 space-y-3 min-h-[220px] max-h-[270px] overflow-y-auto text-xs flex flex-col justify-end">
          {/* Bot Welcome Message */}
          <div className="flex items-start gap-2">
            {renderAvatar('w-7 h-7 text-xs')}
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-2.5 shadow-2xs max-w-[85%] text-slate-700 leading-relaxed whitespace-pre-wrap">
              {welcomeText}
            </div>
          </div>

          {/* User Message: "Hello" */}
          <div className="flex justify-end">
            <div
              className="text-white rounded-2xl rounded-tr-xs px-3 py-2 max-w-[80%] shadow-2xs leading-relaxed"
              style={{ backgroundColor: brandColor }}
            >
              Hello
            </div>
          </div>

          {/* Lead collection prompt if enabled */}
          {config.lead_collection_enabled && (
            <div className="flex items-start gap-2">
              {renderAvatar('w-7 h-7 text-xs')}
              <div className="bg-white border border-blue-100 rounded-xl p-2.5 shadow-2xs max-w-[90%] text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">
                  Leave your details to speak with our team:
                </p>
                <div className="space-y-1">
                  {config.lead_fields.name && (
                    <div className="h-6 bg-slate-50 border border-slate-200 rounded px-2 flex items-center text-[10px] text-slate-400">
                      Your Name
                    </div>
                  )}
                  {config.lead_fields.email && (
                    <div className="h-6 bg-slate-50 border border-slate-200 rounded px-2 flex items-center text-[10px] text-slate-400">
                      Your Email
                    </div>
                  )}
                  {config.lead_fields.phone && (
                    <div className="h-6 bg-slate-50 border border-slate-200 rounded px-2 flex items-center text-[10px] text-slate-400">
                      Phone Number
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar: Ask anything... + ➤ */}
        <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            readOnly
            placeholder="Ask anything..."
            className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-400 cursor-not-allowed"
          />
          <button
            type="button"
            className="w-7 h-7 rounded-lg text-white flex items-center justify-center shadow-xs transition-colors"
            style={{ backgroundColor: brandColor }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center mt-3">
        Preview reflects Assistant Name, Welcome Message, Avatar, and Brand Color.
      </p>
    </div>
  );
};
