'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HeroSection } from '@/components/cards/HeroSection';
import { MetricCard } from '@/components/cards/MetricCard';
import { QuickActions } from '@/components/cards/QuickActions';
import { UpgradeCard } from '@/components/cards/UpgradeCard';
import { ChatbotCard } from '@/components/chatbot/ChatbotCard';
import { UsageOverview } from '@/components/charts/UsageOverview';
import { RecentActivity } from '@/components/cards/RecentActivity';
import { WebsiteIntegration } from '@/components/cards/WebsiteIntegration';
import { ExploreFeatures } from '@/components/cards/ExploreFeatures';
import { SupportCard } from '@/components/cards/SupportCard';
import { Footer } from '@/components/layout/Footer';
import { CreateBotModal } from '@/components/ui/CreateBotModal';
import { mockChatbots, mockMetrics } from '@/lib/mock-data';

export default function DashboardHubPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <DashboardLayout>
      {/* 1. HERO SECTION & PRO COLUMN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <HeroSection />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <UpgradeCard />
          <QuickActions onOpenCreateModal={() => setModalOpen(true)} />
        </div>
      </div>

      {/* 2. FOUR CLEAN METRIC CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      {/* 3. MAIN WORKSPACE: LEFT (CHATBOTS) & RIGHT (USAGE + ACTIVITY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Your Chatbots */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Your Chatbots</h2>
              <Link href="/my-chatbots" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-4">
              {mockChatbots.map((bot) => (
                <ChatbotCard key={bot.id} chatbot={bot} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Usage Overview & Recent Activity */}
        <div className="lg:col-span-7 space-y-4">
          <UsageOverview />
          <RecentActivity />
        </div>
      </div>

      {/* 4. WEBSITE INTEGRATION PANEL */}
      <WebsiteIntegration />

      {/* 5. EXPLORE FEATURES & SUPPORT CARD */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <ExploreFeatures />
        </div>
        <div className="lg:col-span-4">
          <SupportCard />
        </div>
      </section>

      {/* 6. FOOTER */}
      <Footer />

      {/* Create Bot Modal */}
      <CreateBotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {}}
      />
    </DashboardLayout>
  );
}
