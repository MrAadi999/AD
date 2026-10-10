'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeSnippet {
  language: string;
  label: string;
  code: string;
}

interface CodeBlockProps {
  snippets: CodeSnippet[];
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ snippets, title }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeSnippet = snippets[activeTab] || snippets[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0F172A] overflow-hidden shadow-xl text-left">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1E293B] border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-xs font-semibold text-slate-300 mr-2 border-r border-slate-700 pr-3">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1">
            {snippets.map((snip, idx) => (
              <button
                key={snip.label}
                onClick={() => setActiveTab(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeTab === idx
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {snip.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto text-[13px] font-mono text-slate-200 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
        <pre>
          <code>{activeSnippet.code}</code>
        </pre>
      </div>
    </div>
  );
};
