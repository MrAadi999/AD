'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChatbotForm } from '@/components/chatbot/chatbot-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewChatbotPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 text-left">
          <Link
            href="/my-chatbots"
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            My Chatbots
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">New Assistant</span>
        </div>

        {/* Multi-Step Onboarding Form */}
        <ChatbotForm />
      </div>
    </DashboardLayout>
  );
}
