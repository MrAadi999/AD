'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export const UpgradeCard: React.FC = () => {
  return (
    <div className="rounded-2xl p-5 bg-gradient-to-br from-[#070D18] via-[#0E1726] to-[#0A1322] text-white border border-[#162238] shadow-subtle relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-400 tracking-wider uppercase bg-blue-500/15 border border-blue-400/20 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Upgrade to Pro
        </span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        Get more bots, API access, voice &amp; calling features.
      </p>
      <button className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-lg transition-all shadow-md shadow-blue-600/30">
        <span>View Plans</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
