'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Target,
  Send,
  Sparkles,
  Phone,
  Building2,
  GraduationCap,
  Stethoscope,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  DollarSign,
  TrendingUp,
  Flame,
  ShieldCheck,
  Users,
  MessageCircle,
  ArrowRight,
  Zap
} from 'lucide-react';

interface ClientLead {
  name: string;
  category: 'Coaching' | 'Doctor / Clinic' | 'Festive Retail' | 'Real Estate';
  location: string;
  phonePlaceholder: string;
  ticketSize: string;
  pitchAngle: string;
}

const HIGH_VALUE_NICHES: ClientLead[] = [
  {
    name: 'Top Coaching Institutes (JEE / NEET / UPSC)',
    category: 'Coaching',
    location: 'Boring Road / Kankarbagh / Patna',
    phonePlaceholder: '9876543210',
    ticketSize: '₹40,000 – ₹1,20,000 per student',
    pitchAngle: 'Late-night inquiry lead capture. Convert 2 extra admissions per month for ₹1 Lakh+ profit.'
  },
  {
    name: 'Private Doctors & PolyClinics (OPD Booking)',
    category: 'Doctor / Clinic',
    location: 'Raja Bazar / Bailey Road / Kankarbagh',
    phonePlaceholder: '9835012345',
    ticketSize: '₹500 – ₹1,000 OPD Fee',
    pitchAngle: 'Automate WhatsApp appointment tokens so receptionist does not miss patient calls.'
  },
  {
    name: 'Diwali Festive Saree & Garment Merchants',
    category: 'Festive Retail',
    location: 'Hathwa Market / Patna Market / Bakarganj',
    phonePlaceholder: '9431098765',
    ticketSize: '₹1,500 – ₹15,000 per order',
    pitchAngle: 'Send new festive catalog and take orders 24x7 on WhatsApp during Diwali rush.'
  },
  {
    name: 'Real Estate Brokers & Builders',
    category: 'Real Estate',
    location: 'Patliputra / Danapur / Bihta',
    phonePlaceholder: '9934055555',
    ticketSize: '₹35 Lakh – ₹1.2 Cr per flat',
    pitchAngle: 'Schedule weekend site visits automatically and verify buyer budget on WhatsApp.'
  }
];

export default function CEOClientsPage() {
  const [selectedNiche, setSelectedNiche] = useState<ClientLead>(HIGH_VALUE_NICHES[0]);
  const [clientBizName, setClientBizName] = useState('Career Point Institute');
  const [clientPhone, setClientPhone] = useState('9876543210');
  const [industryKey, setIndustryKey] = useState<'coaching' | 'clinic' | 'retail' | 'realestate'>('coaching');
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate public demo link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const demoUrl = `${origin}/demo?biz=${encodeURIComponent(clientBizName)}&industry=${industryKey}`;

  // Generate personalized WhatsApp pitch
  const getWhatsAppPitch = () => {
    if (industryKey === 'coaching') {
      return `Pranam Sir! 🙏 Maine aapke institute "${clientBizName}" ke liye ek AI Admission Chatbot tayyar kiya hai.\n\nYeh bot raat ko bhi students aur parents ke sawalon ka turant jawab deta hai (fees, batch timing, scholarship test) aur unka Phone Number note karke aapko bhej deta hai.\n\n📱 Aap apne phone par live test karke dekhiye:\n${demoUrl}\n\nDiwali festive season me hum aapko 7 din bilkul FREE trial de rahe hain. Pasand aaye toh theek, warna ₹0 kharcha! Kya main kal aapko 2 minute ka brief demo dikha sakta hoon?`;
    }
    if (industryKey === 'clinic') {
      return `Pranam Doctor Sahab! 🙏 Maine aapke clinic "${clientBizName}" ke liye ek automated 24x7 OPD Appointment AI Bot banaya hai.\n\nPatients WhatsApp par direct OPD timing, doctor availability jaan sakte hain aur apna appointment token book kar sakte hain. Receptionist ko phone par pareshan hone ki zaroorat nahi padegi.\n\n📱 Live test karke dekhiye:\n${demoUrl}\n\nHum aapke clinic ke liye 7-din ka free setup de rahe hain. Kripya dekhein aur batayein!`;
    }
    if (industryKey === 'retail') {
      return `Namaste Bhaiya! 🙏 Diwali shopping season ke liye maine aapki dukaan "${clientBizName}" ke liye ek 24x7 WhatsApp Sales Bot tayyar kiya hai.\n\nGrahak WhatsApp par aayenge toh bot nayi saree/suit ki photo, price aur offer turant dikha kar order confirm kar lega!\n\n📱 Dekhiye aapki dukaan ka live demo:\n${demoUrl}\n\nAbhi 7 din free chala kar dekhiye. Pasnad na aaye toh ₹0 kharcha!`;
    }
    return `Namaste Sir! 🙏 Maine "${clientBizName}" ke liye ek AI Property Assistant tayyar kiya hai.\n\nBuyers ko flats ki rate, RERA details, floor plan batata hai aur Sunday site visit automatically schedule karta hai.\n\n📱 Live Demo check kijiye:\n${demoUrl}\n\nPehle 7 din free setup ke sath available hai!`;
  };

  const currentPitch = getWhatsAppPitch();
  const cleanPhone = clientPhone.replace(/\D/g, '');
  const waSendUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(currentPitch)}`;

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(currentPitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(demoUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 text-left max-w-6xl mx-auto pb-12">
        {/* CEO Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1528] via-[#0F1E3A] to-[#1E1B4B] border border-blue-900/50 rounded-3xl p-8 sm:p-10 shadow-2xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-semibold text-amber-300">
                <CrownIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>CEO Revenue Command Center • Client Acquisition Engine</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                How We Get Paying Clients Today
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                As CEO, our formula is simple and unbeatable: <strong>Build their bot first, send the demo on WhatsApp, and give a 7-day risk-free trial.</strong> Zero resistance, high conversions!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-[240px]">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-emerald-400">₹2,999</div>
                <div className="text-[11px] text-slate-300">Target Monthly Fee</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-blue-400">20 Clients</div>
                <div className="text-[11px] text-slate-300">= ₹60,000/mo Pure Profit</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Client Closing Machine */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Target High Ticket</h3>
            <p className="text-xs text-slate-500">
              Target businesses where 1 single lead makes them ₹10,000+ (Coaching, Doctors, Retail, Real Estate).
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Instant Personalized Demo</h3>
            <p className="text-xs text-slate-500">
              Put their exact name below. We generate a live mobile smartphone demo URL in 1 second.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Send on WhatsApp</h3>
            <p className="text-xs text-slate-500">
              Send our proven 7-Day Free Trial pitch. When they test their own bot, they immediately want it!
            </p>
          </div>
        </div>

        {/* Interactive 1-Click Client Demo & Pitch Generator */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>1-Click Client Demo & WhatsApp Pitch Generator</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Customize the pitch for any business owner in seconds and send directly via WhatsApp.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200">
              <span>Zero Resistance Strategy</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Config (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Select Target Industry
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'coaching', label: 'Coaching / Institute', icon: GraduationCap },
                    { key: 'clinic', label: 'Doctor / Clinic', icon: Stethoscope },
                    { key: 'retail', label: 'Diwali Saree / Retail', icon: ShoppingBag },
                    { key: 'realestate', label: 'Real Estate / Flats', icon: Building2 },
                  ].map((ind) => {
                    const Icon = ind.icon;
                    return (
                      <button
                        key={ind.key}
                        type="button"
                        onClick={() => {
                          setIndustryKey(ind.key as any);
                          if (ind.key === 'coaching') setClientBizName('Career Point Patna');
                          if (ind.key === 'clinic') setClientBizName('Dr. Verma Child & Healthcare');
                          if (ind.key === 'retail') setClientBizName('Dulhan Saree Emporium');
                          if (ind.key === 'realestate') setClientBizName('Patliputra Green Enclave');
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 transition-all ${
                          industryKey === ind.key
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{ind.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Business / Client Name
                </label>
                <input
                  type="text"
                  value={clientBizName}
                  onChange={(e) => setClientBizName(e.target.value)}
                  placeholder="e.g. Allen Career Institute Patna"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Client WhatsApp Number (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <span className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Demo Link Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>Custom Live Demo URL:</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 truncate select-all">
                  {demoUrl}
                </div>
                <div className="flex justify-end">
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                  >
                    <span>Open Live Demo in New Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Generated WhatsApp Pitch Box (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg border border-slate-800">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      Personalized WhatsApp Pitch (Ready to Send)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPitch}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-all flex items-center gap-1"
                  >
                    {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPitch ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-xl text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap border border-slate-800/80 max-h-[320px] overflow-y-auto">
                  {currentPitch}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={waSendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex-1 py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send via WhatsApp (+91 {clientPhone})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="w-full sm:w-auto py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-xl transition-all"
                >
                  Copy Pitch Only
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Street Closing Playbook: Objection Killers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>CEO Closing Playbook: What to Say When Clients Object</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Memorize these 3 counter-arguments. They guarantee a 7-day free trial activation on the spot.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <span>Objection 1:</span>
                <span className="text-slate-900 font-semibold">&quot;₹2,999 bohot mehenga hai&quot;</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Your Reply:</strong> &quot;Sir, ₹2,999 ka matlab sirf <strong>₹99 roz ka kharcha</strong> hai — ek coffee ke barabar! Agar ye bot mahine me sirf 1 naya student ya 2 order close kar deta hai, toh aapko seedha <strong>₹40,000 ka faayda</strong> hoga. Pehle 7 din free chala kar dekhiye, 1 paisa nahi lagega.&quot;
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                <span>Objection 2:</span>
                <span className="text-slate-900 font-semibold">&quot;Humare paas receptionist hai&quot;</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Your Reply:</strong> &quot;Sir, receptionist sham 7 baje ghar chali jaati hain aur Sunday ko chhutti hoti hai. Par 60% students aur customers raat 8 se 11 baje inquiry karte hain. Ye bot bina thake 24 ghante inquiry handle karta hai aur agle din receptionist ko ready phone list deta hai!&quot;
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                <span>Objection 3:</span>
                <span className="text-slate-900 font-semibold">&quot;Mujhe tech samajh nahi aati&quot;</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                <strong>Your Reply:</strong> &quot;Sir aapko kuch seekhne ki zaroorat nahi hai. Hum 2 minute me aapke WhatsApp aur website par live karke denge. Saari nayi leads aapke personal mobile par direct message ke roop me aayengi.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Pricing & Monthly Recurring Revenue (MRR) Ladder */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-900/60 rounded-3xl p-6 sm:p-8 text-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Business Unit Economics</div>
              <h3 className="text-xl font-bold text-white mt-1">Our Pricing Plans for Clients</h3>
              <p className="text-xs text-slate-300 mt-1">
                Charge monthly recurring SaaS fees directly to local businesses with 92%+ gross profit margins.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="text-xs font-semibold text-slate-400">Starter Local</div>
              <div className="text-2xl font-black text-white">₹1,499 <span className="text-xs font-normal text-slate-400">/mo</span></div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>• Web Chat Widget</div>
                <div>• Up to 2,000 Chats / month</div>
                <div>• Lead Capture via Email</div>
                <div>• 7-Day Free Trial</div>
              </div>
            </div>

            <div className="p-5 bg-blue-600/30 border-2 border-blue-400/60 rounded-2xl space-y-3 relative">
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-blue-500 text-[10px] font-bold rounded-full uppercase">
                Most Popular
              </div>
              <div className="text-xs font-semibold text-blue-300">Growth Pro (Coaching & Clinic)</div>
              <div className="text-2xl font-black text-white">₹2,999 <span className="text-xs font-normal text-slate-400">/mo</span></div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>• Full Web + WhatsApp Routing</div>
                <div>• Up to 10,000 Chats / month</div>
                <div>• Direct WhatsApp SMS Lead Alert</div>
                <div>• Custom Hindi & Hinglish Tuning</div>
              </div>
            </div>

            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <div className="text-xs font-semibold text-slate-400">Enterprise Multi-Branch</div>
              <div className="text-2xl font-black text-white">₹6,999 <span className="text-xs font-normal text-slate-400">/mo</span></div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>• Multi-Location & CRM Integration</div>
                <div>• Unlimited Dialogues</div>
                <div>• Dedicated Manager Setup</div>
                <div>• Custom Sub-20ms AD Model</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}
