'use client';

import React from 'react';
import {
  Users,
  Mic,
  MessageCircle,
  Code2,
  BarChart3,
  Globe2,
} from 'lucide-react';
import { mockFeatures } from '@/lib/mock-data';

export const ExploreFeatures: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'users':
        return <Users className="w-4 h-4 text-blue-600" />;
      case 'mic':
        return <Mic className="w-4 h-4 text-purple-600" />;
      case 'message-circle':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'code':
        return <Code2 className="w-4 h-4 text-amber-600" />;
      case 'bar-chart':
        return <BarChart3 className="w-4 h-4 text-blue-600" />;
      case 'globe':
        return <Globe2 className="w-4 h-4 text-indigo-600" />;
      default:
        return <Users className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBadgeBg = (name: string) => {
    switch (name) {
      case 'users':
        return 'bg-blue-50';
      case 'mic':
        return 'bg-purple-50';
      case 'message-circle':
        return 'bg-emerald-50';
      case 'code':
        return 'bg-amber-50';
      case 'bar-chart':
        return 'bg-blue-50';
      case 'globe':
        return 'bg-indigo-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle">
      <div className="mb-4 text-left">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">
          Explore More Features
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Powerful tools to grow your business with AI.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {mockFeatures.map((feat) => (
          <div
            key={feat.id}
            className="p-3.5 rounded-xl border border-slate-200/90 hover:border-blue-400 hover:shadow-xs transition-all text-left group"
          >
            <div
              className={`w-7 h-7 rounded-lg ${getBadgeBg(
                feat.iconName
              )} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}
            >
              {getIcon(feat.iconName)}
            </div>
            <h3 className="text-xs font-bold text-slate-900">{feat.title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{feat.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
