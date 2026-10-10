'use client';

import React from 'react';
import { Headphones, ArrowRight } from 'lucide-react';

export const SupportCard: React.FC = () => {
  return (
    <div className="rounded-2xl p-6 bg-[#070D18] text-white border border-[#152136] shadow-subtle flex flex-col justify-between text-left">
      <div>
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-sm shadow-blue-500/25">
          <Headphones className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">Need Help?</h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Our team is here for you. We provide live integration assistance, architecture review, and 24/7 technical support.
        </p>
      </div>

      <div className="mt-6">
        <a
          href="mailto:support@biharstack.ai"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
        >
          <span>Contact Support</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
