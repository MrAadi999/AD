'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Phone,
  CheckCircle2,
  Calendar,
  ShoppingBag,
  GraduationCap,
  Stethoscope,
  Building2,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const INDUSTRY_CONFIGS: Record<string, {
  defaultName: string;
  avatarIcon: any;
  themeColor: string;
  welcomeMsg: string;
  quickPrompts: string[];
}> = {
  coaching: {
    defaultName: 'Career Point Academy',
    avatarIcon: GraduationCap,
    themeColor: '#2563EB',
    welcomeMsg: 'Namaste! Career Point Academy me aapka swagat hai. Main AI admission assistant hoon. JEE, NEET ya Foundation batch ki details ya scholarship test ke bare me kya janna chahte hain?',
    quickPrompts: [
      'JEE 2026 batch ki fees kitni hai?',
      'Sunday scholarship test kab hai?',
      'Free demo class book karni hai'
    ]
  },
  clinic: {
    defaultName: 'Dr. Verma Healthcare & OPD',
    avatarIcon: Stethoscope,
    themeColor: '#059669',
    welcomeMsg: 'Namaste! Dr. Verma Clinic me aapka swagat hai. OPD timing, appointment token ya doctor availability ke bare me kya madad kar sakta hoon?',
    quickPrompts: [
      'Doctor sahab se appointment mil sakta hai?',
      'OPD timing kya hai?',
      'Sunday ko clinic open rehti hai kya?'
    ]
  },
  retail: {
    defaultName: 'Royal Saree & Garments',
    avatarIcon: ShoppingBag,
    themeColor: '#D97706',
    welcomeMsg: 'Namaste! Royal Saree & Garments me aapka swagat hai. Hamare paas Diwali & Wedding collection par special festive offer chal raha hai. Aap kya dekhna chahenge?',
    quickPrompts: [
      'Diwali festive offer me kitna discount hai?',
      'Bridal lehenga aur sarees ki price range?',
      'Home delivery ya COD available hai?'
    ]
  },
  realestate: {
    defaultName: 'Patliputra Green Heights',
    avatarIcon: Building2,
    themeColor: '#7C3AED',
    welcomeMsg: 'Namaste! Patliputra Green Heights me aapka swagat hai. 2 & 3 BHK luxury flats aur commercial shops available hain. RERA verified aur bank loan approved hai.',
    quickPrompts: [
      'Flat ka price aur carpet area kya hai?',
      'Kya ye project RERA approved hai?',
      'Is Sunday site visit book karni hai'
    ]
  }
};

export default function ClientPublicDemoPage() {
  const searchParams = useSearchParams();
  const rawIndustry = searchParams.get('industry') || 'coaching';
  const industryKey = INDUSTRY_CONFIGS[rawIndustry] ? rawIndustry : 'coaching';
  const cfg = INDUSTRY_CONFIGS[industryKey];

  const businessName = searchParams.get('biz') || cfg.defaultName;
  const ownerPhone = searchParams.get('phone') || '';

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: cfg.welcomeMsg.replace(cfg.defaultName, businessName),
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (userText: string) => {
    const textToSend = userText.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMsg = {
      role: 'user',
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbotId: '1',
          message: textToSend,
          context: `You are representing ${businessName}. Industry: ${industryKey}. Always be respectful in polite Hinglish/Hindi. If user asks for pricing, offer clear value and ask for their name/phone number to book a free slot or send catalogue.`
        })
      });

      const data = await res.json();
      const reply = data.reply || data.text || 'Shukriya! Hamari team aapse jald hi sampark karegi.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      // Offline fallback
      let fallback = `Namaste! ${businessName} me aapki inquiry note kar li gayi hai. Kripya apna contact number share karein, hamari team aapse turant connect karegi.`;
      if (/fee|price|discount/i.test(textToSend)) {
        fallback = `Namaste! ${businessName} ke special packages par festive offer chal raha hai. Exact details ke liye kripya apna Phone Number share karein, hum WhatsApp par details bhej denge.`;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallback,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = cfg.avatarIcon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      {/* Top Floating Badge */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between px-2">
        <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Client Interactive Demo</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Powered by BiharStack AI
        </div>
      </div>

      {/* Smartphone Frame Wrapper */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col h-[650px] relative">
        {/* Chat Header */}
        <div
          className="p-4 text-white flex items-center justify-between shadow-md z-10"
          style={{ backgroundColor: cfg.themeColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-inner">
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight truncate max-w-[200px]">
                {businessName}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>24x7 AI Assistant • Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-white border border-white/20">
              FAST VERIFIED
            </div>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div
                  className={`text-[9px] mt-1 text-right ${
                    m.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>{businessName} Assistant is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 flex gap-1.5 overflow-x-auto no-scrollbar">
          {cfg.quickPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-[10px] font-medium text-slate-700 whitespace-nowrap shadow-2xs transition-all flex items-center gap-1"
            >
              <span>{prompt}</span>
              <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(input);
            }}
            placeholder="Type your message here..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
          />
          <button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => handleSend(input)}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom CTA for Business Owners */}
      <div className="w-full max-w-md mt-4 text-center space-y-2">
        <div className="p-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl text-white text-xs flex items-center justify-between gap-3">
          <div className="text-left">
            <div className="font-bold text-emerald-400">Want this AI Bot for your business?</div>
            <div className="text-[11px] text-slate-300">Takes 2 minutes to install. Free 7-day trial.</div>
          </div>
          <a
            href="https://wa.me/919876543210?text=Hello%20Aditya%20Bhai,%20I%20want%20this%20AI%20Chatbot%20for%20my%20business!"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Activate on WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
