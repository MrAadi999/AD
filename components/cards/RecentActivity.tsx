'use client';

import React from 'react';
import { mockActivities } from '@/lib/mock-data';

export const RecentActivity: React.FC = () => {
  const getDotColor = (type: string) => {
    switch (type) {
      case 'conversation':
        return 'bg-emerald-500';
      case 'lead':
        return 'bg-purple-500';
      case 'kb':
        return 'bg-blue-500';
      case 'api':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h2>
        <span className="text-[11px] text-slate-400 font-medium">Real-time</span>
      </div>

      <div className="space-y-3">
        {mockActivities.map((act) => (
          <div key={act.id} className="flex items-start justify-between text-left">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${getDotColor(act.type)} mt-0.5 flex-shrink-0`} />
              <div>
                <p className="text-xs font-semibold text-slate-900 leading-tight">
                  {act.title}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  {act.description}
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">{act.timeAgo}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
