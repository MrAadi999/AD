'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Globe, BookOpen, Key, FileText, ChevronRight } from 'lucide-react';

interface QuickActionsProps {
  onOpenCreateModal?: () => void;
  onSelectConnectWebsite?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onSelectConnectWebsite,
}) => {
  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle text-left">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        Quick Actions
      </h2>
      <div className="space-y-1.5">
        <Link
          href="/chatbots/new"
          className="w-full flex items-center justify-between p-2 rounded-lg bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 transition-colors text-xs font-semibold group"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Create New Bot</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <button
          onClick={onSelectConnectWebsite}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-xs font-medium group"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            <span>Connect Website</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <Link
          href="/knowledge-base"
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-xs font-medium group"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
            <span>Add Knowledge Base</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="/api-developers"
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-xs font-medium group"
        >
          <div className="flex items-center gap-2.5">
            <Key className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
            <span>Get API Key</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          href="#docs"
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-xs font-medium group"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            <span>View Documentation</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
