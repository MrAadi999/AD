'use client';

import React from 'react';
import { MessageSquare, Eye, Users, Zap } from 'lucide-react';
import { MetricItem } from '@/types/dashboard';

interface MetricCardProps {
  metric: MetricItem;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const getIcon = () => {
    switch (metric.iconName) {
      case 'conversations':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'visitors':
        return <Eye className="w-4 h-4 text-purple-600" />;
      case 'leads':
        return <Users className="w-4 h-4 text-emerald-600" />;
      case 'speed':
        return <Zap className="w-4 h-4 text-amber-600" />;
    }
  };

  const getIconBg = () => {
    switch (metric.iconName) {
      case 'conversations':
        return 'bg-blue-50';
      case 'visitors':
        return 'bg-purple-50';
      case 'leads':
        return 'bg-emerald-50';
      case 'speed':
        return 'bg-amber-50';
    }
  };

  return (
    <div className="bg-white border border-[#E6EBF2] rounded-xl p-5 shadow-subtle hover:shadow-card-hover transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{metric.title}</span>
        <div className={`w-7 h-7 rounded-lg ${getIconBg()} flex items-center justify-center`}>
          {getIcon()}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {metric.value}
        </span>
        <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
          {metric.changeType === 'increase' ? '↑' : '↓'} {metric.change}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mt-1">{metric.periodText}</p>
    </div>
  );
};
