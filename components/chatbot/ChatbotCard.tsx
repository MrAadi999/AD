'use client';

import React from 'react';
import { ChatbotItem } from '@/types/dashboard';

interface ChatbotCardProps {
  chatbot: ChatbotItem;
  onEdit?: (id: string) => void;
  onAnalytics?: (id: string) => void;
}

export const ChatbotCard: React.FC<ChatbotCardProps> = ({
  chatbot,
  onEdit,
  onAnalytics,
}) => {
  return (
    <div className="p-4 rounded-xl border border-slate-200/90 hover:border-blue-400 transition-all bg-slate-50/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg ${chatbot.avatarColor} text-white font-bold flex items-center justify-center text-xs shadow-xs`}
          >
            {chatbot.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">{chatbot.name}</h3>
            <a
              href={chatbot.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-blue-600 truncate block max-w-[160px]"
            >
              {chatbot.website}
            </a>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {chatbot.status}
        </span>
      </div>

      {/* Metrics */}
      <div className="mt-3.5 grid grid-cols-3 gap-2 py-2 px-3 bg-white rounded-lg border border-slate-200/60 text-center">
        <div>
          <span className="block text-xs font-bold text-slate-800">
            {chatbot.conversations.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Conversations</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-slate-800">
            {chatbot.leads.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Leads</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-emerald-600">
            {chatbot.accuracy}%
          </span>
          <span className="text-[10px] text-slate-400">Accuracy</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit?.(chatbot.id)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onAnalytics?.(chatbot.id)}
          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors"
        >
          Analytics
        </button>
      </div>
    </div>
  );
};
