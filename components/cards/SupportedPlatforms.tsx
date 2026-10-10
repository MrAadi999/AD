'use client';

import React from 'react';
import { Code2, Terminal } from 'lucide-react';

export const SupportedPlatforms: React.FC = () => {
  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-700 mb-3 text-left">
        Supported Platforms
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* WordPress */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all">
          <svg className="w-5 h-5 text-[#21759B] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-8.81 9.998c0-1.84.582-3.542 1.572-4.943l4.385 12.015A8.828 8.828 0 013.19 11.998zm8.81 8.812a8.77 8.77 0 01-3.23-.615l3.414-9.92 3.493 9.57a8.766 8.766 0 01-3.677.965zm1.536-12.87c.725 0 1.258.45 1.258 1.05 0 .5-.292.95-.916 1.45l-.942.75 3.766 10.435A8.817 8.817 0 0020.81 12c0-2.316-.882-4.422-2.33-6.012l-4.944 6.072z"/>
          </svg>
          <span className="text-xs font-semibold text-slate-800">WordPress</span>
        </div>

        {/* Shopify */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
          <svg className="w-5 h-5 text-[#95BF47] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.42 2.1l-.82 1.95a3.9 3.9 0 00-1.74-.46c-1.3 0-2.07.72-2.07 1.83 0 1.95 2.8 2.2 2.8 3.86 0 .75-.54 1.24-1.42 1.24a3.83 3.83 0 01-2.23-.74l-.79 1.99c.74.52 1.85.83 2.94.83 2.5 0 3.71-1.34 3.71-3.08 0-2.12-2.82-2.35-2.82-3.8 0-.61.46-1.02 1.28-1.02.58 0 1.13.16 1.63.45l.8-1.92A5.67 5.67 0 0015.42 2.1zM5 7l2 14h10l2-14H5z"/>
          </svg>
          <span className="text-xs font-semibold text-slate-800">Shopify</span>
        </div>

        {/* Webflow */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all">
          <span className="w-5 h-5 rounded-md bg-[#146EF5] text-white font-extrabold text-[10px] flex items-center justify-center flex-shrink-0">
            W
          </span>
          <span className="text-xs font-semibold text-slate-800">Webflow</span>
        </div>

        {/* Wix */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all">
          <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-black text-[9px] flex items-center justify-center flex-shrink-0">
            WiX
          </span>
          <span className="text-xs font-semibold text-slate-800">Wix</span>
        </div>

        {/* Custom Website */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-purple-300 hover:shadow-xs transition-all">
          <Code2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-800">Custom Site</span>
        </div>

        {/* API */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
          <Terminal className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-800">REST API</span>
        </div>
      </div>
    </div>
  );
};
