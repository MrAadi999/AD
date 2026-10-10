'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="pt-6 pb-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-700">BiharStack AI</span>
        <span>&bull;</span>
        <span>Build. Integrate. Grow.</span>
      </div>
      <div className="flex items-center gap-5 font-medium">
        <a href="#docs" className="hover:text-blue-600 transition-colors">
          Docs
        </a>
        <a href="#support" className="hover:text-blue-600 transition-colors">
          Support
        </a>
        <a href="#privacy" className="hover:text-blue-600 transition-colors">
          Privacy
        </a>
        <a href="#terms" className="hover:text-blue-600 transition-colors">
          Terms
        </a>
      </div>
    </footer>
  );
};
