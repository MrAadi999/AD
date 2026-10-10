'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { SupportedPlatforms } from './SupportedPlatforms';

export const WebsiteIntegration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'js' | 'react' | 'wordpress'>('js');
  const [copied, setCopied] = useState(false);

  const snippets = {
    js: `<script
  src="https://cdn.biharstack.ai/widget.js"
  data-bot-id="YOUR_BOT_ID">
</script>`,

    react: `import Script from 'next/script';

<Script
  src="https://cdn.biharstack.ai/widget.js"
  data-bot-id="YOUR_BOT_ID"
  strategy="lazyOnload"
/>`,

    wordpress: `<script
  src="https://cdn.biharstack.ai/widget.js"
  data-bot-id="YOUR_BOT_ID">
</script>`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Integrate With Your Website
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add a simple script and your chatbot will be live instantly.
          </p>
        </div>
        <span className="inline-flex self-start sm:self-auto text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Turn website into AI chatbot in &lt; 2 minutes
        </span>
      </div>

      {/* Framework Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-2 mb-3">
        {(['js', 'react', 'wordpress'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'js' ? 'JavaScript' : tab === 'react' ? 'React' : 'WordPress'}
          </button>
        ))}
      </div>

      {/* Code Box with Copy */}
      <div className="relative bg-[#070D18] rounded-xl p-4 font-mono text-xs overflow-x-auto border border-[#152136]">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-md text-xs font-sans font-medium flex items-center gap-1.5 border border-slate-700 transition-all shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>

        <pre className="text-slate-200 leading-relaxed">
          <code>{snippets[activeTab]}</code>
        </pre>
      </div>

      {/* Supported Platforms */}
      <SupportedPlatforms />
    </section>
  );
};
