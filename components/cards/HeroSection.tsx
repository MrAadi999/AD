'use client';

import React from 'react';
import { Clock, Globe, Languages, Code2 } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';

export const HeroSection: React.FC = () => {
  const { profile, user } = useAuth();
  const rawName = profile?.full_name || user?.user_metadata?.full_name || 'Aditya';
  const firstName = rawName.trim().split(' ')[0];

  return (
    <section className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-subtle flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left Hero Text */}
        <div className="max-w-xl text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome Back, {firstName}! 👋
          </h1>

          <p className="text-sm font-semibold text-slate-700 mt-1">
            Your AI journey is just getting started.
          </p>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Create your first chatbot and turn your website into a 24/7 AI assistant in under 2 minutes.
          </p>

          {/* Four Feature Indicators */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700">
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              No Code
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              2 Minute Setup
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700">
              <Globe className="w-3.5 h-3.5 text-purple-600" />
              Website + Docs
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-700">
              <Languages className="w-3.5 h-3.5 text-amber-600" />
              Multi-Language
            </span>
          </div>
        </div>

        {/* Right Hero: Friendly AI Robot Illustration + Speech Bubble */}
        <div className="flex items-center gap-3.5 flex-shrink-0 animate-float">
          {/* Speech Bubble */}
          <div className="relative bg-white border border-blue-200 text-slate-800 px-3.5 py-2.5 rounded-2xl shadow-sm text-xs font-medium max-w-[170px] leading-snug">
            <span>Hello! How can I help you today?</span>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-blue-200" />
            <div className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white" />
          </div>

          {/* Sleek Modern AI Robot SVG */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            <svg
              className="w-full h-full drop-shadow-md"
              viewBox="0 0 140 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="70" cy="70" r="54" fill="#3B82F6" fillOpacity="0.08" />
              <path
                d="M48 88C48 76.9543 56.9543 68 68 68H72C83.0457 68 92 76.9543 92 88V106C92 112.627 86.6274 118 80 118H60C53.3726 118 48 112.627 48 106V88Z"
                fill="#F1F5F9"
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />
              <rect x="62" y="85" width="16" height="18" rx="4" fill="#2563EB" />
              <path
                d="M66 89H71C72.5 89 74 89.8 74 91.2C74 92.5 73 93.3 71.5 93.5C73 93.8 74.2 94.7 74.2 96.2C74.2 97.8 72.8 99 71 99H66V89Z"
                stroke="#93C5FD"
                strokeWidth="1.2"
                fill="none"
              />
              <rect x="36" y="28" width="68" height="50" rx="22" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
              <rect x="42" y="34" width="56" height="38" rx="16" fill="#0A1120" />
              <path d="M49 52C49 48 54 48 56 52" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
              <path d="M84 52C84 48 89 48 91 52" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
              <path d="M66 60C68 62 72 62 74 60" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              <path d="M70 28V20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="70" cy="18" r="4.5" fill="#2563EB" stroke="#93C5FD" strokeWidth="1.5" />
              <path d="M48 82C40 76 34 68 32 58" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="32" cy="56" r="5" fill="#2563EB" />
              <path d="M92 82C100 86 104 94 104 102" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
              <circle cx="104" cy="102" r="5" fill="#64748B" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};
