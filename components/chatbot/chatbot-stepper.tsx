'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ChatbotStepperProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { number: 1, label: '01 Basic Info' },
  { number: 2, label: '02 Website' },
  { number: 3, label: '03 Customize' },
  { number: 4, label: '04 Review' },
];

export const ChatbotStepper: React.FC<ChatbotStepperProps> = ({ currentStep }) => {
  return (
    <div className="w-full bg-white border border-[#E6EBF2] rounded-xl p-3 sm:p-4 mb-6 shadow-2xs">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, idx) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : step.number}
                </div>
                <span
                  className={`text-xs font-semibold hidden md:inline ${
                    isCurrent
                      ? 'text-slate-900 font-bold'
                      : isDone
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                    currentStep > step.number ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
