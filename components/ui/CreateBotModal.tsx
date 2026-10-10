'use client';

import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface CreateBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (botName: string) => void;
}

export const CreateBotModal: React.FC<CreateBotModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [botName, setBotName] = useState('Customer Support AI');
  const [websiteUrl, setWebsiteUrl] = useState('https://mywebsite.com');
  const [source, setSource] = useState<'crawl' | 'docs' | 'qa'>('crawl');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreated(botName);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-blue-500/30">
            B
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Create New AI Chatbot
            </h3>
            <p className="text-xs text-slate-500">
              Turn your website into an AI chatbot in under 2 minutes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chatbot Name
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g. Sales Assistant"
              required
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              required
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Knowledge Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSource('crawl')}
                className={`p-2 text-center text-xs font-semibold rounded-lg border transition-colors ${
                  source === 'crawl'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Web Crawl
              </button>
              <button
                type="button"
                onClick={() => setSource('docs')}
                className={`p-2 text-center text-xs font-semibold rounded-lg border transition-colors ${
                  source === 'docs'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                PDF / Docs
              </button>
              <button
                type="button"
                onClick={() => setSource('qa')}
                className={`p-2 text-center text-xs font-semibold rounded-lg border transition-colors ${
                  source === 'qa'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Notion / Q&amp;A
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 flex items-center gap-1.5"
            >
              <span>Generate Chatbot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
