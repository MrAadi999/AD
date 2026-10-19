'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Cpu,
  Code2,
  Share2,
  BarChart3,
  CreditCard,
  Settings,
  Plus,
  LogOut,
  X,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpenCreateModal?: () => void;
}

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Client Hunter (CEO)', icon: Target, href: '/clients', badge: 'GET CLIENTS' },
  { name: 'AD Model Hub', icon: Sparkles, href: '/model-ad', badge: 'AI MODEL' },
  { name: 'My Chatbots', icon: Bot, href: '/my-chatbots', count: 2 },
  { name: 'Knowledge Base', icon: BookOpen, href: '/knowledge-base' },
  { name: 'AI Agents', icon: Cpu, href: '/ai-agents' },
  { name: 'API & Developers', icon: Code2, href: '/api-developers' },
  { name: 'Integrations', icon: Share2, href: '/integrations' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Billing', icon: CreditCard, href: '/billing' },
  { name: 'Settings', icon: Settings, href: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, workspace, signOut } = useAuth();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Aditya Kumar';
  const planName = workspace?.plan ? `${workspace.plan.toUpperCase()} Plan` : 'Free Plan';
  const initials =
    displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'AK';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#070D18] border-r border-[#152136] flex flex-col justify-between transition-transform duration-200 ease-in-out select-none lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand & Nav */}
        <div className="flex-1 overflow-y-auto sidebar-scroll px-4 pt-5 pb-3">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 mb-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/10 flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 4.5C6 3.67157 6.67157 3 7.5 3H13.25C15.8734 3 18 5.12665 18 7.75C18 9.27855 17.2798 10.6385 16.1601 11.5103C17.7882 12.396 18.875 14.1331 18.875 16.125C18.875 19.0935 16.4685 21.5 13.5 21.5H7.5C6.67157 21.5 6 20.8284 6 20V4.5Z"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 12H13.5C15.1569 12 16.5 13.3431 16.5 15C16.5 16.6569 15.1569 18 13.5 18H6"
                    stroke="#93C5FD"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11 7.5L14 7.5"
                    stroke="#93C5FD"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-white font-bold text-sm tracking-tight leading-tight">
                  BiharStack AI
                </span>
                <span className="text-slate-400 text-[11px] font-medium tracking-wide">
                  AI for Every Business
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items (1 to 9) */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === '/dashboard' && pathname === '/') ||
                (item.href === '/my-chatbots' && pathname.startsWith('/chatbots'));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-[#131E33]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {(item as any).badge ? (
                    <span className="text-[9px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30 uppercase tracking-wider">
                      {(item as any).badge}
                    </span>
                  ) : item.count ? (
                    <span className="text-[10px] font-bold bg-[#152136] text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Promotional Mini-Card */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-b from-[#111C30] to-[#0A1322] border border-[#1E2E48] text-left relative overflow-hidden">
            <p className="text-white text-xs font-semibold leading-snug">
              Turn your website into an AI chatbot in 2 minutes.
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              No coding. No hassle. Add a simple script.
            </p>
            <Link
              href="/chatbots/new"
              className="mt-3.5 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-500/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Bot</span>
            </Link>
          </div>
        </div>

        {/* Bottom User Profile */}
        <div className="p-3 border-t border-[#152136] bg-[#050A13]">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#131E33] transition-colors group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-blue-500/30 flex-shrink-0">
                {initials}
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-white text-xs font-semibold group-hover:text-blue-400 transition-colors truncate">
                  {displayName}
                </span>
                <span className="text-slate-400 text-[10px]">{planName}</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-1.5 pt-2 border-t border-[#111C30] flex items-center justify-between px-2 text-[10px] text-slate-500">
            <span>BiharStack AI v1.0</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operational
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
