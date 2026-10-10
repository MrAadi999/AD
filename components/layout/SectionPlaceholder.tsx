'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Bot, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SectionPlaceholderProps {
  title: string;
  subtitle: string;
  description: string;
}

export const SectionPlaceholder: React.FC<SectionPlaceholderProps> = ({
  title,
  subtitle,
  description,
}) => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">{title}</span>
        </div>

        {/* Section Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl p-8 shadow-subtle text-left max-w-4xl">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">{subtitle}</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xl">{description}</p>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Workspace Isolated &amp; RLS Protected
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
