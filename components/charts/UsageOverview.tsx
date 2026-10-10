'use client';

import React, { useState } from 'react';

export const UsageOverview: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '24h'>('7d');

  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Usage Overview</h2>
          <div className="flex items-center gap-3 mt-1 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-blue-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Conversations
            </span>
            <span className="flex items-center gap-1.5 font-medium text-purple-600">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              Leads
            </span>
          </div>
        </div>

        {/* Time Selector */}
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
              period === '7d'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Last 7 days
          </button>
        </div>
      </div>

      {/* SVG Smooth Dual Line Chart */}
      <div className="relative h-44 w-full pt-1">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 500 170"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartPurpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          <line x1="0" y1="30" x2="500" y2="30" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="120" x2="500" y2="120" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />

          {/* Leads area & line (purple) */}
          <path
            d="M 0 135 C 90 130, 180 115, 260 100 C 340 85, 420 65, 500 45 L 500 160 L 0 160 Z"
            fill="url(#chartPurpleGrad)"
          />
          <path
            d="M 0 135 C 90 130, 180 115, 260 100 C 340 85, 420 65, 500 45"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Conversations area & line (blue) */}
          <path
            d="M 0 115 C 80 80, 160 120, 240 85 C 320 50, 400 70, 500 20 L 500 160 L 0 160 Z"
            fill="url(#chartBlueGrad)"
          />
          <path
            d="M 0 115 C 80 80, 160 120, 240 85 C 320 50, 400 70, 500 20"
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          <circle cx="240" cy="85" r="4" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
          <circle cx="500" cy="20" r="4.5" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
          <circle cx="500" cy="45" r="4" fill="#8B5CF6" stroke="#ffffff" strokeWidth="2" />
        </svg>

        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 px-1">
          <span>Sep 22</span>
          <span>Sep 23</span>
          <span>Sep 24</span>
          <span>Sep 25</span>
          <span>Sep 26</span>
          <span>Sep 27</span>
          <span className="font-bold text-blue-600">Sep 28</span>
        </div>
      </div>
    </div>
  );
};
