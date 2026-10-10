'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { CrawlJob, KnowledgeSource } from '@/lib/crawler/types';
import {
  ArrowLeft,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Layers,
  Database,
  Trash2,
  Eye,
  X,
  Cpu,
  Plus,
  Edit3,
  Phone,
  Mail,
  Tag,
  MapPin,
  MessageCircle,
} from 'lucide-react';

interface VectorMatch {
  id: string;
  knowledge_source_id?: string;
  content: string;
  chunk_index: number;
  token_count: number;
  similarity: number;
  metadata?: {
    url?: string;
    title?: string;
    heading?: string;
  };
}

const FAST_TEMPLATES = [
  {
    icon: '🪔',
    badge: 'DIWALI SPECIAL',
    title: 'Diwali Festive Offer & Helpline',
    desc: '20% discount offer, coupon DIWALI2026, helpline & 2-hr resolution guarantee.',
    content: `Diwali Festive Sale Offer: 20% flat discount on all business plans and products.
Festive Coupon Code: DIWALI2026
Helpline & WhatsApp Support: +91 98765 43210
Office Address: Bailey Road, Patna, Bihar - 800001
Working Hours: 9:00 AM to 9:00 PM IST (All 7 Days)
Special Delivery: Free express delivery across Bihar and UP for all festive orders.
Customer Escalation: 2-hour priority resolution guarantee for any complaints.`
  },
  {
    icon: '🛍️',
    badge: 'RETAIL / E-COMMERCE',
    title: 'Store Timings, COD & 7-Day Returns',
    desc: 'Operating hours, cash on delivery terms, 7-day return policy and UPI payment methods.',
    content: `Business Name: Retail & E-Commerce Operations
Operating Timings: 10:00 AM to 9:00 PM (Monday to Sunday)
Customer Care Phone / WhatsApp: +91 98765 43210
Support Email: support@biharstack.ai
Return & Refund Policy: 7-day hassle-free return window. 100% full refund credited within 24-48 hours of return pickup.
Payment Methods: Cash on Delivery (COD) supported up to ₹10,000. UPI (GPay, PhonePe, Paytm), Net Banking, and Debit/Credit Cards.
Delivery Timeline: 2-3 business days standard delivery across all Tier-1, 2, and 3 cities.`
  },
  {
    icon: '🎓',
    badge: 'COACHING / EDUCATION',
    title: 'JEE & NEET Batches, Fees & Scholarships',
    desc: 'Annual batch fees, scholarship test schedule, and free 3-day demo class booking.',
    content: `Institute: BiharStack Learning Academy
Offered Courses: JEE Main & Advanced (Target 2026), NEET Medical Foundation (Target 2026), 9th-10th Board Foundation.
Course Fees: JEE Foundation ₹65,000/year | NEET Target ₹55,000/year | Class 9-10th ₹35,000/year.
Scholarship Test: Every Sunday at 10:00 AM. Up to 100% tuition fee waiver for top rankers.
Admissions Helpline: +91 98765 43210
Complimentary Demo: Free 3-day classroom or online demo session available on mobile registration.`
  },
  {
    icon: '🩺',
    badge: 'CLINIC / HEALTHCARE',
    title: 'Doctor OPD Timings & Emergency Safeguard',
    desc: 'Consultation fees, OPD morning/evening schedule, and emergency ambulance trigger.',
    content: `Healthcare Center: BiharStack Medical & Health Clinic
OPD Timings: Morning 10:00 AM - 1:30 PM | Evening 5:00 PM - 8:30 PM (Mon-Sat)
Doctor Consultation Fee: General Physician ₹400 | Senior Consultant / Specialist ₹700.
Appointment Booking: Call or WhatsApp +91 98765 43210 to get immediate queue token.
Emergency Protocol: In case of acute chest pain, trauma, or severe breathing difficulty, please call 108 ambulance immediately or visit the nearest 24/7 emergency casualty hospital.`
  }
];

export default function ChatbotKnowledgePage() {
  const params = useParams();
  const router = useRouter();
  const { workspace } = useAuth();
  const botId = params?.id as string;

  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [crawlJob, setCrawlJob] = useState<CrawlJob | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [chunkStats, setChunkStats] = useState({ total_chunks: 0, total_tokens: 0 });
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState<string | null>(null);

  // Business Intelligence facts state
  const [businessFacts, setBusinessFacts] = useState<{
    phones?: string[];
    emails?: string[];
    prices?: string[];
    whatsapp?: string[];
  } | null>(null);

  // Manual Knowledge & URL Edit states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addKnowledgeType, setAddKnowledgeType] = useState<'link' | 'text' | 'template'>('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const [isEditUrlOpen, setIsEditUrlOpen] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  // Test Knowledge Vector Search state
  const [testQuery, setTestQuery] = useState('');
  const [testSearching, setTestSearching] = useState(false);
  const [testResults, setTestResults] = useState<VectorMatch[] | null>(null);
  const [testSearchedOnce, setTestSearchedOnce] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Modal for viewing content
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchKnowledgeData = async () => {
    if (!botId) return;
    try {
      const res = await fetch(`/api/chatbots/${botId}/knowledge`);
      if (res.ok) {
        const data = await res.json();
        setChatbot(data.chatbot);
        setCrawlJob(data.latest_job);
        setKnowledgeSources(data.knowledge_sources || []);
        if (data.business_facts) {
          setBusinessFacts(data.business_facts);
        }
        if (data.stats) {
          setChunkStats({
            total_chunks: data.stats.total_chunks || 0,
            total_tokens: data.stats.total_tokens || 0,
          });
        }
      }
    } catch (e) {
      console.error('Failed to load knowledge data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeData();

    // Auto-open teaching studio if ?teach=true is present in the URL
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('teach') === 'true' || searchParams.get('openTeach') === 'true') {
        setIsAddModalOpen(true);
      }
    }

    // Start polling if crawling is active or queued
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/chatbots/${botId}/knowledge`);
        if (res.ok) {
          const data = await res.json();
          setCrawlJob(data.latest_job);
          setKnowledgeSources(data.knowledge_sources || []);
          if (data.business_facts) setBusinessFacts(data.business_facts);
          if (data.chatbot) setChatbot(data.chatbot);
          if (data.stats) {
            setChunkStats({
              total_chunks: data.stats.total_chunks || 0,
              total_tokens: data.stats.total_tokens || 0,
            });
          }
        }
      } catch {
        // silent polling error
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [botId]);

  const handleStartOrRetryCrawl = async (targetUrl?: any) => {
    setActionError(null);
    setProcessSuccess(null);

    const urlToUse =
      typeof targetUrl === 'string' && targetUrl.trim()
        ? targetUrl.trim()
        : chatbot?.website_url?.trim();

    // If website URL is missing, open the Teach Your AI Studio immediately rather than showing an error
    if (!urlToUse) {
      setAddKnowledgeType('link');
      setIsAddModalOpen(true);
      return;
    }

    setRetrying(true);

    try {
      const res = await fetch('/api/crawl/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbot_id: botId, website_url: urlToUse }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        // If crawl failed, open manual teaching modal so user can paste data
        setActionError(json.error || 'Failed to crawl website.');
        setIsAddModalOpen(true);
        setRetrying(false);
        return;
      }

      await fetchKnowledgeData();
    } catch (e: any) {
      setActionError(e.message || 'Error triggering crawl.');
      setIsAddModalOpen(true);
    } finally {
      setRetrying(false);
    }
  };

  const handleProcessKnowledge = async () => {
    setActionError(null);
    setProcessSuccess(null);
    setProcessing(true);

    try {
      const res = await fetch(`/api/chatbots/${botId}/process-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setActionError(json.error || 'Failed to process knowledge chunks.');
        return;
      }

      const totalChunks = json.summary?.totalChunks || 0;
      setProcessSuccess(`Successfully processed and embedded ${totalChunks} knowledge chunks into pgvector.`);
      await fetchKnowledgeData();
    } catch (e: any) {
      setActionError(e.message || 'Error executing knowledge processing.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this page and all its vector chunks?')) {
      return;
    }

    setDeletingId(sourceId);
    setActionError(null);

    try {
      const res = await fetch(`/api/chatbots/${botId}/knowledge?sourceId=${sourceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        setActionError(json.error || 'Failed to delete knowledge source.');
        return;
      }

      await fetchKnowledgeData();
    } catch (e: any) {
      setActionError(e.message || 'Error deleting knowledge source.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addKnowledgeType === 'link' && !linkUrl.trim()) return;
    if (addKnowledgeType === 'text' && (!manualTitle.trim() || !manualContent.trim())) return;

    setSavingManual(true);
    setActionError(null);
    setProcessSuccess(null);

    try {
      const payload =
        addKnowledgeType === 'link'
          ? {
              url: linkUrl.trim(),
              title: manualTitle.trim() || undefined,
              sourceType: 'website',
            }
          : {
              title: manualTitle.trim(),
              content: manualContent.trim(),
              sourceType: 'document',
            };

      const res = await fetch(`/api/chatbots/${botId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setActionError(json.error || 'Failed to save knowledge.');
        return;
      }

      setIsAddModalOpen(false);
      setLinkUrl('');
      setManualTitle('');
      setManualContent('');
      setProcessSuccess(
        addKnowledgeType === 'link'
          ? `Successfully ingested web link "${json.source?.title || linkUrl.trim()}" into bot's brain!`
          : 'Knowledge document added and indexed into vector search successfully!'
      );
      await fetchKnowledgeData();
    } catch (err: any) {
      setActionError(err.message || 'Error saving knowledge.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleUpdateWebsiteUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUrl.trim()) return;

    setSavingUrl(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/chatbots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_url: editUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setActionError(json.error || 'Failed to update website URL.');
        return;
      }

      setIsEditUrlOpen(false);
      setProcessSuccess(`Website URL updated to ${editUrl.trim()}. Scanning website now...`);
      if (chatbot) {
        setChatbot({ ...chatbot, website_url: editUrl.trim() });
      }
      await handleStartOrRetryCrawl(editUrl.trim());
    } catch (err: any) {
      setActionError(err.message || 'Error updating website URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleTestSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testQuery.trim()) return;

    setTestSearching(true);
    setTestError(null);
    setTestSearchedOnce(true);

    try {
      const res = await fetch(`/api/chatbots/${botId}/test-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery.trim(),
          topK: 4,
          threshold: 0.15,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setTestError(json.error || 'Vector search failed.');
        setTestResults([]);
        return;
      }

      setTestResults(json.matches || []);
    } catch (err: any) {
      setTestError(err.message || 'Error during vector similarity search.');
      setTestResults([]);
    } finally {
      setTestSearching(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading website knowledge...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalWords = knowledgeSources.reduce((acc, s) => acc + (s.word_count || 0), 0);
  const pagesDiscovered = crawlJob?.pages_discovered || knowledgeSources.length;
  const pagesProcessed = crawlJob?.pages_processed || knowledgeSources.length;
  const pagesRemaining = Math.max(0, pagesDiscovered - pagesProcessed);

  const isJobDone =
    crawlJob?.status === 'completed' ||
    Boolean(crawlJob?.completed_at) ||
    (pagesDiscovered > 0 && pagesProcessed >= pagesDiscovered && knowledgeSources.length > 0);

  const isCrawling =
    !isJobDone &&
    (crawlJob?.status === 'crawling' || crawlJob?.status === 'queued');

  const isCompleted = isJobDone || knowledgeSources.length > 0;
  const isFailed = crawlJob?.status === 'failed' && knowledgeSources.length === 0;
  const isEmpty = !crawlJob && knowledgeSources.length === 0;

  let progressPercent = 0;
  if (isCompleted && !isCrawling) {
    progressPercent = 100;
  } else if (pagesDiscovered > 0) {
    progressPercent = Math.min(
      95,
      Math.max(10, Math.round((pagesProcessed / Math.max(pagesDiscovered, 1)) * 100))
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-5xl mx-auto pb-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href={`/chatbots/${botId}`}
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {chatbot?.name || 'Assistant'}
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Website Knowledge</span>
        </div>

        {actionError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {processSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{processSuccess}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Website Knowledge
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isCrawling
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isFailed
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {isCrawling && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                )}
                {isCrawling
                  ? 'Crawling...'
                  : isCompleted
                  ? chunkStats.total_chunks > 0
                    ? 'Vectors Ready'
                    : 'Knowledge Ready'
                  : isFailed
                  ? 'Crawl Failed'
                  : 'Idle'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Website:</span>
              <a
                href={chatbot?.website_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <span>{chatbot?.website_url || 'None specified'}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setEditUrl(chatbot?.website_url || 'https://');
                  setIsEditUrlOpen(true);
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded flex items-center gap-1 transition-all ml-1"
                title="Change target website URL"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit URL</span>
              </button>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
              title="Add manual Q&A, contact details, policies, or custom text"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Knowledge / FAQ</span>
            </button>

            {knowledgeSources.length > 0 && !isCrawling && (
              <button
                onClick={handleProcessKnowledge}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-all shadow-2xs disabled:opacity-50"
                title="Process pages into chunks and generate 768-dim embeddings"
              >
                {processing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{processing ? 'Processing Chunks...' : 'Process Chunks'}</span>
              </button>
            )}

            {!isCrawling && (
              <button
                onClick={handleStartOrRetryCrawl}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-2xs disabled:opacity-50"
              >
                {retrying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Retry Crawl</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. ACTIVE CRAWLING STATE */}
        {isCrawling && (
          <div className="bg-white border border-blue-200 rounded-2xl p-6 sm:p-7 shadow-subtle space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Teaching your AI...
                  </h3>
                  <p className="text-xs text-slate-500">
                    Crawling website and extracting clean readable content.
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-blue-600 font-mono">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Pages found
                </span>
                <span className="text-lg font-bold text-slate-800">
                  {pagesDiscovered}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Pages processed
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {pagesProcessed}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Pages remaining
                </span>
                <span className="text-lg font-bold text-slate-600">
                  {pagesRemaining}
                </span>
              </div>
            </div>

            {crawlJob?.current_page && (
              <div className="pt-2 text-xs flex items-center gap-2 text-slate-500">
                <span className="font-semibold text-slate-700 flex-shrink-0">
                  Current page:
                </span>
                <span className="font-mono text-[11px] text-blue-600 truncate bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">
                  {crawlJob.current_page}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. CRAWL & KNOWLEDGE COMPLETION BANNER */}
        {isCompleted && !isCrawling && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Website content processed and ready for AI retrieval
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <span className="font-bold">{knowledgeSources.length}</span> pages analyzed •{' '}
                  <span className="font-bold">{totalWords.toLocaleString()}</span> words extracted •{' '}
                  <span className="font-bold">{chunkStats.total_chunks}</span> vector chunks indexed{' '}
                  ({chunkStats.total_tokens.toLocaleString()} tokens).
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-1">
                  Semantic embeddings stored in pgvector with multi-tenant row-level security.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chunkStats.total_chunks === 0 && (
                <button
                  onClick={handleProcessKnowledge}
                  disabled={processing}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Index Chunks Now</span>
                </button>
              )}
            </div>
          </div>
        )}

        {knowledgeSources.length > 0 && businessFacts && (businessFacts.phones?.length || businessFacts.emails?.length || businessFacts.prices?.length || businessFacts.whatsapp?.length) ? (
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/60 border border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Extracted Business Intelligence &amp; Key Facts
                </h3>
              </div>
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                Auto-Harvested
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Our deep extraction engine analyzed your website pages and isolated critical contact points and offerings:
            </p>

            <div className={`grid grid-cols-1 sm:grid-cols-2 ${businessFacts.whatsapp?.length ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 pt-1`}>
              {/* Phones */}
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-blue-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Contact Numbers ({businessFacts.phones?.length || 0})</span>
                </div>
                {businessFacts.phones && businessFacts.phones.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {businessFacts.phones.map((p, idx) => (
                      <span key={idx} className="font-mono text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">None detected</span>
                )}
              </div>

              {/* WhatsApp (if present) */}
              {businessFacts.whatsapp && businessFacts.whatsapp.length > 0 ? (
                <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Support ({businessFacts.whatsapp.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {businessFacts.whatsapp.map((w, idx) => (
                      <span key={idx} className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Emails */}
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-indigo-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Email Inquiries ({businessFacts.emails?.length || 0})</span>
                </div>
                {businessFacts.emails && businessFacts.emails.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {businessFacts.emails.map((e, idx) => (
                      <span key={idx} className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {e}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">None detected</span>
                )}
              </div>

              {/* Pricing */}
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-purple-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span>Pricing &amp; Plans ({businessFacts.prices?.length || 0})</span>
                </div>
                {businessFacts.prices && businessFacts.prices.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {businessFacts.prices.slice(0, 4).map((pr, idx) => (
                      <span key={idx} className="font-mono text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {pr}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">None detected</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* 3. METRICS CARDS */}
        {knowledgeSources.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E6EBF2] rounded-xl p-4 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Pages</span>
                <Globe className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {knowledgeSources.length}
              </p>
              <span className="text-[10px] text-slate-400">crawled &amp; parsed</span>
            </div>

            <div className="bg-white border border-[#E6EBF2] rounded-xl p-4 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Words</span>
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {totalWords.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400">clean text words</span>
            </div>

            <div className="bg-white border border-[#E6EBF2] rounded-xl p-4 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Chunks</span>
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {chunkStats.total_chunks}
              </p>
              <span className="text-[10px] text-slate-400">~600 tokens/chunk</span>
            </div>

            <div className="bg-white border border-[#E6EBF2] rounded-xl p-4 shadow-subtle">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Vector Store</span>
                <Database className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                768-d
              </p>
              <span className="text-[10px] text-slate-400">pgvector HNSW cosine</span>
            </div>
          </div>
        )}

        {/* 4. TEST KNOWLEDGE RETRIEVAL SECTION */}
        {knowledgeSources.length > 0 && (
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Test Knowledge Retrieval (Vector Search Preview)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify how your knowledge base matches questions against embedded website chunks using cosine distance.
                </p>
              </div>

              {chunkStats.total_chunks === 0 && (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">
                  Chunks not yet generated. Click &ldquo;Process Chunks&rdquo; above.
                </span>
              )}
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleTestSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Ask a question or enter a topic (e.g. 'What services do you offer?')..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={testSearching || !testQuery.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
              >
                {testSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search Knowledge</span>
              </button>
            </form>

            {testError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
                {testError}
              </div>
            )}

            {/* Test Results Display */}
            {testSearchedOnce && !testSearching && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">
                    Found {testResults?.length || 0} relevant chunk{testResults?.length === 1 ? '' : 's'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Similarity threshold: &gt; 15%
                  </span>
                </div>

                {(!testResults || testResults.length === 0) ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500">
                      No matching chunks found for &ldquo;{testQuery}&rdquo;.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Make sure your pages are processed into chunks, or try a broader question.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {testResults.map((match, idx) => {
                      const scorePct = Math.round(match.similarity * 100);
                      const isHigh = scorePct >= 60;
                      const isMed = scorePct >= 35 && scorePct < 60;

                      return (
                        <div
                          key={match.id || idx}
                          className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl hover:border-blue-200 transition-all text-left space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isHigh
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : isMed
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {scorePct}% match
                              </span>
                              <span className="text-[11px] font-medium text-slate-700 truncate">
                                {match.metadata?.title || 'Knowledge Chunk'}
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                              Chunk #{match.chunk_index + 1} • {match.token_count} tokens
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 font-sans leading-relaxed line-clamp-3 bg-white p-2.5 rounded-lg border border-slate-100">
                            {match.content}
                          </p>

                          {match.metadata?.url && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <a
                                href={match.metadata.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 truncate"
                              >
                                {match.metadata.url}
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. CRAWL FAILED BANNER */}
        {isFailed && !isCrawling && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Website scanning could not reach {chatbot?.website_url || 'this website'}.
                </h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  {crawlJob?.error_message ||
                    'Unable to access this domain. You can scan the authentic BiharStack seed knowledge base, enter your live website URL, or paste your business information directly!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={handleStartOrRetryCrawl}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                {retrying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Scan BiharStack AI Facts</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Paste Text / Add FAQ</span>
              </button>

              <button
                onClick={() => {
                  setEditUrl(chatbot?.website_url || 'https://');
                  setIsEditUrlOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Change Website URL</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. EMPTY STATE */}
        {isEmpty && !isCrawling && (
          <div className="bg-white border border-[#E6EBF2] rounded-2xl p-10 text-center shadow-subtle max-w-lg mx-auto my-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Teach your AI assistant in under 2 minutes
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Provide facts, contact numbers, pricing, and policies so your bot gives accurate answers with zero guessing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => {
                  setAddKnowledgeType('link');
                  setIsAddModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/30 transition-all"
              >
                <Globe className="w-4 h-4" />
                <span>🌐 Scan Website URL</span>
              </button>

              <button
                onClick={() => {
                  setAddKnowledgeType('text');
                  setIsAddModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>📝 Paste Text / FAQs</span>
              </button>

              <button
                onClick={() => {
                  setAddKnowledgeType('template');
                  setIsAddModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>⚡ 1-Click Fast Templates</span>
              </button>
            </div>
          </div>
        )}

        {/* 7. EXTRACTED PAGES TABLE */}
        {knowledgeSources.length > 0 && (
          <div className="bg-white border border-[#E6EBF2] rounded-2xl overflow-hidden shadow-subtle">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Extracted Pages &amp; Knowledge
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clean textual content parsed and chunked for this assistant.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                {knowledgeSources.length} pages
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100">
                    <th className="py-3 px-5">Page / Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Words</th>
                    <th className="py-3 px-4">Last Crawled</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {knowledgeSources.map((source) => {
                    const formattedDate = source.crawled_at
                      ? new Date(source.crawled_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now';

                    const chunksCount = source.chunks_count ?? 0;

                    return (
                      <tr
                        key={source.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-start gap-2.5">
                            <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 block truncate max-w-xs sm:max-w-md">
                                {source.title || 'Untitled Page'}
                              </span>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-slate-400 hover:text-blue-600 truncate block max-w-xs sm:max-w-md"
                              >
                                {source.url}
                              </a>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {source.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {chunksCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <Layers className="w-3 h-3 text-purple-600" />
                              <span>{chunksCount} chunks</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                          {source.word_count?.toLocaleString() || 0} words
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSource(source)}
                              title="Inspect Extracted Content"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              disabled={deletingId === source.id}
                              title="Delete Page & Chunks"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                            >
                              {deletingId === source.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Security & Multi-tenant guarantee banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Vector embeddings and knowledge sources are isolated strictly to your authenticated workspace via Row Level Security (RLS) and cosine HNSW index.
          </span>
        </div>

        {/* Modal: View Extracted Content */}
        {selectedSource && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="min-w-0 pr-4">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {selectedSource.title || 'Extracted Page Content'}
                  </h3>
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline truncate block"
                  >
                    {selectedSource.url}
                  </a>
                </div>
                <button
                  onClick={() => setSelectedSource(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50/50">
                {selectedSource.content || 'No text extracted.'}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
                <span>Word count: {selectedSource.word_count?.toLocaleString() || 0}</span>
                <button
                  onClick={() => setSelectedSource(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Knowledge / Web Link / FAQ */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Teach Your AI Studio</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Train your assistant with website links, custom business FAQs, or 1-click industry templates.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector: Web Link vs Custom Text vs Fast Templates */}
              <div className="px-5 pt-4 flex gap-2 border-b border-slate-100 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setAddKnowledgeType('link')}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    addKnowledgeType === 'link'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web Link / URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddKnowledgeType('text')}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    addKnowledgeType === 'text'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Text / FAQ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAddKnowledgeType('template')}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    addKnowledgeType === 'template'
                      ? 'border-amber-600 text-amber-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>⚡ 1-Click Fast Templates</span>
                </button>
              </div>

              <form onSubmit={handleAddKnowledge} className="p-5 space-y-4">
                {addKnowledgeType === 'template' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                      Select any industry template below to instantly load verified business policies, pricing, and contact details:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                      {FAST_TEMPLATES.map((tpl, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setManualTitle(tpl.title);
                            setManualContent(tpl.content);
                            setAddKnowledgeType('text');
                          }}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/60 cursor-pointer transition-all text-left space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xl">{tpl.icon}</span>
                            <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-700 rounded-md">
                              {tpl.badge}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                            {tpl.title}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                            {tpl.desc}
                          </p>
                          <div className="text-[10px] text-blue-600 font-semibold pt-1 flex items-center gap-1">
                            <span>Apply &amp; Edit Template</span>
                            <span>→</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : addKnowledgeType === 'link' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Web Link / Page URL <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Globe className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          required
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://example.com/pricing or https://docs.company.com/faq"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Enter any public web page, pricing table, documentation link, or blog post.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Optional Label / Title <span className="text-slate-400 font-normal">(Auto-extracted if blank)</span>
                      </label>
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Official Pricing & Plan Breakdown"
                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all outline-none"
                      />
                    </div>

                    <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
                      💡 <strong>Instant Crawl &amp; Embed:</strong> Our crawler will fetch this URL live, extract headings, clean text, contact numbers, and pricing, and embed it into the bot&apos;s brain vector store immediately.
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Document / Topic Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Official Contact Details & Office Address"
                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Knowledge Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={manualContent}
                        onChange={(e) => setManualContent(e.target.value)}
                        placeholder="Paste details here, e.g.:
Phone Helpline: +91 98765 43210
Office: Patna, Bihar
Working Hours: 9 AM to 7 PM IST
Policy: 100% refund within 14 days..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all outline-none font-mono"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        This content will be chunked and indexed into the vector store immediately.
                      </p>
                    </div>
                  </>
                )}

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  {addKnowledgeType !== 'template' ? (
                    <button
                      type="submit"
                      disabled={
                        savingManual ||
                        (addKnowledgeType === 'link' && !linkUrl.trim()) ||
                        (addKnowledgeType === 'text' && (!manualTitle.trim() || !manualContent.trim()))
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                      {savingManual ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {savingManual
                          ? addKnowledgeType === 'link'
                            ? 'Crawling & Learning...'
                            : 'Indexing...'
                          : addKnowledgeType === 'link'
                          ? 'Ingest Web Link'
                          : 'Save & Index Knowledge'}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Click any template above to apply and edit
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Website URL */}
        {isEditUrlOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Change Website URL
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update the target website URL for your AI assistant.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditUrlOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateWebsiteUrl} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    required
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Make sure the website begins with http:// or https://.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditUrlOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUrl || !editUrl.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {savingUrl ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{savingUrl ? 'Updating...' : 'Save & Scan Website'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
