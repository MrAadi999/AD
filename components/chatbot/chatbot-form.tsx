'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotConfig, DEFAULT_CHATBOT_CONFIG } from '@/lib/chatbot/types';
import {
  validateStep1,
  validateStep2,
  validateStep3,
} from '@/lib/chatbot/validation';
import { ChatbotService } from '@/lib/chatbot/service';
import { ChatbotStepper } from './chatbot-stepper';
import { ChatbotBasicInfo } from './chatbot-basic-info';
import { ChatbotWebsite } from './chatbot-website';
import { ChatbotCustomization } from './chatbot-customization';
import { ChatbotReview } from './chatbot-review';
import { ChatbotPreview } from './chatbot-preview';
import { AlertCircle } from 'lucide-react';

export const ChatbotForm: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const handleNextStep1 = () => {
    const check = validateStep1(config);
    if (!check.isValid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    const check = validateStep2(config);
    if (!check.isValid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setCurrentStep(3);
  };

  const handleNextStep3 = () => {
    const check = validateStep3(config);
    if (!check.isValid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setCurrentStep(4);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSaving(true);

    const workspaceId = workspace?.id || 'ws-demo-01';
    const res = await ChatbotService.createChatbot(workspaceId, config);

    if (res.error || !res.data) {
      setSubmitError(res.error || 'Failed to create chatbot. Please try again.');
      setSaving(false);
      return;
    }

    setSaving(false);
    setIsCreated(true);

    // Navigate to /chatbots/[id]
    setTimeout(() => {
      router.push(`/chatbots/${res.data!.id}`);
    }, 700);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Progress Stepper (01 Basic Info, 02 Website, 03 Customize, 04 Review) */}
      <ChatbotStepper currentStep={currentStep} totalSteps={4} />

      {submitError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout: Step Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-7">
          {currentStep === 1 && (
            <ChatbotBasicInfo
              config={config}
              errors={errors}
              onChange={handleChange}
              onBack={() => router.push('/my-chatbots')}
              onContinue={handleNextStep1}
            />
          )}

          {currentStep === 2 && (
            <ChatbotWebsite
              config={config}
              errors={errors}
              onChange={handleChange}
              onBack={() => setCurrentStep(1)}
              onContinue={handleNextStep2}
            />
          )}

          {currentStep === 3 && (
            <ChatbotCustomization
              config={config}
              errors={errors}
              onChange={handleChange}
              onBack={() => setCurrentStep(2)}
              onContinue={handleNextStep3}
            />
          )}

          {currentStep === 4 && (
            <ChatbotReview
              config={config}
              saving={saving}
              isCreated={isCreated}
              onBack={() => setCurrentStep(3)}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Right Column: Live Chatbot Preview */}
        <div className="lg:col-span-5">
          <ChatbotPreview config={config} />
        </div>
      </div>
    </div>
  );
};
