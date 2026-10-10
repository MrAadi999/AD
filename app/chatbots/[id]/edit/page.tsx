'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotConfig, DEFAULT_CHATBOT_CONFIG } from '@/lib/chatbot/types';
import { validateStep1, validateStep2, validateStep3 } from '@/lib/chatbot/validation';
import { ChatbotBasicInfo } from '@/components/chatbot/chatbot-basic-info';
import { ChatbotWebsite } from '@/components/chatbot/chatbot-website';
import { ChatbotCustomization } from '@/components/chatbot/chatbot-customization';
import { ChatbotPreview } from '@/components/chatbot/chatbot-preview';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export default function EditChatbotPage() {
  const params = useParams();
  const router = useRouter();
  const { workspace } = useAuth();
  const botId = params?.id as string;

  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'website' | 'customize'>('basic');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchBot = async () => {
      const wsId = workspace?.id || 'ws-demo-01';
      if (!botId) return;
      setLoading(true);
      const data = await ChatbotService.getChatbotById(wsId, botId);
      if (data) {
        setConfig({
          ...data,
          website_confirmed: true, // Existing bot has website already confirmed
        });
      }
      setLoading(false);
    };

    fetchBot();
  }, [workspace?.id, botId]);

  const handleChange = (field: keyof ChatbotConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSave = async () => {
    const wsId = workspace?.id || 'ws-demo-01';
    if (!botId) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate
    const v1 = validateStep1(config);
    if (!v1.isValid) {
      setErrors(v1.errors);
      setActiveTab('basic');
      return;
    }

    const v2 = validateStep2(config);
    if (!v2.isValid) {
      setErrors(v2.errors);
      setActiveTab('website');
      return;
    }

    const v3 = validateStep3(config);
    if (!v3.isValid) {
      setErrors(v3.errors);
      setActiveTab('customize');
      return;
    }

    setSaving(true);
    const res = await ChatbotService.updateChatbot(wsId, botId, config);

    if (res.error) {
      setErrorMsg(res.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccessMsg('Chatbot updated successfully!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading chatbot details...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 text-left">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href={`/chatbots/${botId}`}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {config.name || 'Assistant'}
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Edit Settings</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'basic'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Basic Information
          </button>

          <button
            onClick={() => setActiveTab('website')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'website'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Website &amp; Source
          </button>

          <button
            onClick={() => setActiveTab('customize')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'customize'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Personality &amp; Branding
          </button>
        </div>

        {/* 2-Column Responsive Layout: Edit Form + Live Chatbot Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            {activeTab === 'basic' && (
              <ChatbotBasicInfo
                config={config}
                errors={errors}
                onChange={handleChange}
                onContinue={() => setActiveTab('website')}
              />
            )}

            {activeTab === 'website' && (
              <ChatbotWebsite
                config={config}
                errors={errors}
                onChange={handleChange}
                onBack={() => setActiveTab('basic')}
                onContinue={() => setActiveTab('customize')}
              />
            )}

            {activeTab === 'customize' && (
              <ChatbotCustomization
                config={config}
                errors={errors}
                onChange={handleChange}
                onBack={() => setActiveTab('website')}
                onContinue={handleSave}
              />
            )}
          </div>

          <div className="lg:col-span-5">
            <ChatbotPreview config={config} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
