'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, KeyRound, ListFilter, BookOpen, Terminal } from 'lucide-react';

interface DeveloperNavProps {
  onCreateKey?: () => void;
}

const tabs = [
  { name: 'Overview', href: '/api-developers', icon: LayoutDashboard },
  { name: 'API Keys', href: '/api-developers/keys', icon: KeyRound },
  { name: 'Request Logs', href: '/api-developers/logs', icon: ListFilter },
  { name: 'Documentation', href: '/api-developers/docs', icon: BookOpen },
  { name: 'Playground', href: '/api-developers/playground', icon: Terminal },
];

export const DeveloperNav: React.FC<DeveloperNavProps> = ({ onCreateKey }) => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/api-developers'
              ? pathname === '/api-developers'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>

      {onCreateKey && (
        <button
          onClick={onCreateKey}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <KeyRound className="w-3.5 h-3.5 text-blue-400" />
          <span>Create API Key</span>
        </button>
      )}
    </div>
  );
};
