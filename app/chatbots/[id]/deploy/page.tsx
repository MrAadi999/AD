'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { ChatbotService } from '@/lib/chatbot/service';
import {
  ArrowLeft,
  Code2,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Bot,
  Laptop,
  Smartphone,
  Eye,
} from 'lucide-react';

export default function ChatbotDeployPage() {
  const params = useParams();
  const { workspace } = useAuth();
  const botId = params?.id as string;

  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Widget settings
  const [widgetEnabled, setWidgetEnabled] = useState(true);
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [activeTab, setActiveTab] = useState<'html' | 'wordpress' | 'shopify' | 'nextjs'>('html');

  // Live preview state
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const loadChatbot = async () => {
      const wsId = workspace?.id || 'ws-demo-01';
      if (!botId) return;

      try {
        setLoading(true);
        const data = await ChatbotService.getChatbotById(wsId, botId);
        if (data) {
          setChatbot(data);
          setWidgetEnabled(data.widget_enabled !== false);
          setWidgetPosition(data.widget_position || 'bottom-right');
          setAllowedDomains(data.allowed_domains || []);
        }
      } catch (err) {
        console.error('Error loading chatbot:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChatbot();
  }, [workspace?.id, botId]);

  const publicBotId = chatbot?.public_id || chatbot?.id || botId;
  const widgetScriptUrl =
    process.env.NEXT_PUBLIC_WIDGET_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/widget.js` : 'https://cdn.biharstack.ai/widget.js');

  const embedCodeSnippet = `<!-- BiharStack AI Chatbot Widget -->\n<script\n  src="${widgetScriptUrl}"\n  data-bot-id="${publicBotId}">\n</script>`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCodeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0];
    if (!clean) return;

    if (!allowedDomains.includes(clean)) {
      setAllowedDomains((prev) => [...prev, clean]);
    }
    setNewDomainInput('');
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setAllowedDomains((prev) => prev.filter((d) => d !== domainToRemove));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const wsId = workspace?.id || 'ws-demo-01';

    try {
      const updatedFields: Partial<ChatbotConfig> = {
        widget_enabled: widgetEnabled,
        widget_position: widgetPosition,
        allowed_domains: allowedDomains,
      };

      const res = await ChatbotService.updateChatbot(wsId, botId, updatedFields);
      if (res.error) {
        setSaveError(res.error);
      } else {
        setSaveSuccess('Deployment and security settings saved successfully.');
        if (res.data) setChatbot(res.data);
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading deployment configuration...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!chatbot) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center text-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              Chatbot not found.
            </p>
            <Link
              href="/my-chatbots"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Chatbots</span>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 text-left pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link
            href={`/chatbots/${botId}`}
            className="hover:text-blue-600 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {chatbot.name || 'Assistant'}
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">Deploy &amp; Embed</span>
        </div>

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Top Hero Banner */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 sm:p-7 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-md"
              style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
            >
              <Code2 className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Deploy Your AI Assistant
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    widgetEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      widgetEnabled ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}
                  />
                  {widgetEnabled ? 'Widget Active' : 'Widget Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Add AI customer support to your website in under 2 minutes by copying one snippet of code.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Grid: Installation Code + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Embed Code & Platform Guides (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Embed Snippet Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Website Embed Code
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paste this snippet before the closing <code className="text-blue-600 font-mono text-[11px]">&lt;/body&gt;</code> tag on any website.
                  </p>
                </div>

                <button
                  onClick={handleCopyCode}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Box */}
              <div className="relative group">
                <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 selection:bg-blue-600 selection:text-white">
                  <code>{embedCodeSnippet}</code>
                </pre>
              </div>

              {/* Public Bot ID Pill */}
              <div className="pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                <span className="font-medium text-slate-600">Public Bot Identifier:</span>
                <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {publicBotId}
                </span>
              </div>
            </div>

            {/* 2. Platform Installation Guides */}
            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Platform Installation Instructions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your platform for step-by-step instructions.
                </p>
              </div>

              {/* Platform Tabs */}
              <div className="flex border-b border-slate-100 gap-2">
                {[
                  { id: 'html', label: 'HTML / Custom' },
                  { id: 'wordpress', label: 'WordPress' },
                  { id: 'shopify', label: 'Shopify' },
                  { id: 'nextjs', label: 'React / Next.js' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="text-xs text-slate-600 space-y-2 leading-relaxed pt-1">
                {activeTab === 'html' && (
                  <div className="space-y-2">
                    <p>1. Open your website’s HTML template or layout file (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">index.html</code>).</p>
                    <p>2. Scroll to the bottom of the page right before the closing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code> tag.</p>
                    <p>3. Paste the code snippet above and save the file.</p>
                    <p>4. Deploy or refresh your website—the BiharStack AI chat bubble will appear instantly!</p>
                  </div>
                )}

                {activeTab === 'wordpress' && (
                  <div className="space-y-2">
                    <p>1. Log in to your WordPress Admin dashboard.</p>
                    <p>2. Go to <strong>Plugins &rarr; Add New</strong> and install &ldquo;WPCode&rdquo; (or &ldquo;Insert Headers and Footers&rdquo;).</p>
                    <p>3. Open <strong>Code Snippets &rarr; Header &amp; Footer</strong>.</p>
                    <p>4. Paste the script snippet into the <strong>Footer</strong> section and click <strong>Save Changes</strong>.</p>
                  </div>
                )}

                {activeTab === 'shopify' && (
                  <div className="space-y-2">
                    <p>1. Log in to your Shopify Admin.</p>
                    <p>2. Navigate to <strong>Online Store &rarr; Themes</strong>.</p>
                    <p>3. Click the <strong>Actions (&hellip;) &rarr; Edit Code</strong> on your active theme.</p>
                    <p>4. Open <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">theme.liquid</code>, paste the snippet right above <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">&lt;/body&gt;</code>, and click <strong>Save</strong>.</p>
                  </div>
                )}

                {activeTab === 'nextjs' && (
                  <div className="space-y-2">
                    <p>In Next.js App Router, add this to your root <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">app/layout.tsx</code>:</p>
                    <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                      {`import Script from 'next/script';\n\nexport default function RootLayout({ children }) {\n  return (\n    <html>\n      <body>\n        {children}\n        <Script src="${widgetScriptUrl}" data-bot-id="${publicBotId}" strategy="lazyOnload" />\n      </body>\n    </html>\n  );\n}`}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Allowed Domains (Security) Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Allowed Domains Security
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Restrict widget usage strictly to your authorized websites. Leave empty to allow embedding anywhere.
                  </p>
                </div>
              </div>

              {/* Domain Input Form */}
              <form onSubmit={handleAddDomain} className="flex gap-2">
                <input
                  type="text"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="e.g. yourcompany.com or shop.domain.com"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 rounded-lg text-xs text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newDomainInput.trim()}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Domain</span>
                </button>
              </form>

              {/* Domains List */}
              <div className="space-y-2 pt-1">
                {allowedDomains.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>No domain restrictions. Widget will answer requests from any website.</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">Unrestricted</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allowedDomains.map((domain) => (
                      <span
                        key={domain}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg font-mono font-medium"
                      >
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span>{domain}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDomain(domain)}
                          className="hover:text-red-600 transition-colors ml-0.5"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Live Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Widget Position & Enablement Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-5">
              <h3 className="text-sm font-bold text-slate-900">
                Widget Controls &amp; Placement
              </h3>

              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Widget Enablement
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Enable or temporarily hide the widget across all websites.
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={widgetEnabled}
                    onChange={(e) => setWidgetEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* Position Radio Options */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Screen Position
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setWidgetPosition('bottom-right')}
                    className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      widgetPosition === 'bottom-right'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Bottom Right</span>
                  </label>

                  <label
                    onClick={() => setWidgetPosition('bottom-left')}
                    className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      widgetPosition === 'bottom-left'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Bottom Left</span>
                  </label>
                </div>
              </div>

              {/* Color & Personality Summary */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                    style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
                  />
                  <span className="text-slate-600 font-medium">Brand Theme Color</span>
                </div>
                <Link
                  href={`/chatbots/${botId}/edit`}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Edit Tone &amp; Color &rarr;
                </Link>
              </div>
            </div>

            {/* Live Widget Preview Card */}
            <div className="bg-white border border-[#E6EBF2] rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Widget Preview
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click the bubble to toggle the preview window.
                  </p>
                </div>
                <a
                  href="/test-widget.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1"
                >
                  <span>Open Full Demo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Simulated Browser Viewport */}
              <div className="relative h-[420px] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                {/* Browser Top Bar */}
                <div className="bg-white px-3 py-2 border-b border-slate-200 flex items-center gap-2 text-[10px] text-slate-400">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-500 font-mono text-[9px] truncate max-w-[160px]">
                    https://{chatbot.website_url ? chatbot.website_url.replace(/^https?:\/\//, '') : 'yourcompany.com'}
                  </span>
                </div>

                {/* Simulated Webpage Content */}
                <div className="p-4 flex-1 space-y-2 opacity-30 select-none">
                  <div className="w-24 h-4 bg-slate-300 rounded" />
                  <div className="w-full h-8 bg-slate-200 rounded mt-3" />
                  <div className="w-3/4 h-3 bg-slate-200 rounded" />
                  <div className="w-5/6 h-3 bg-slate-200 rounded" />
                </div>

                {/* Interactive Simulated Floating Widget Window */}
                {previewOpen && (
                  <div
                    className={`absolute bottom-16 ${
                      widgetPosition === 'bottom-left' ? 'left-3' : 'right-3'
                    } w-[260px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 z-20`}
                  >
                    <div className="p-2.5 bg-white border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-md text-white font-bold text-[9px] flex items-center justify-center"
                          style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
                        >
                          {(chatbot.name || 'B').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 truncate max-w-[140px]">
                          {chatbot.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setPreviewOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs px-1"
                      >
                        &times;
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 space-y-2 text-[11px] flex-1 min-h-[140px]">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 text-slate-700 leading-relaxed shadow-2xs">
                        {chatbot.welcome_message || 'Hi! How can I help you?'}
                      </div>
                    </div>

                    <div className="p-2 bg-white border-t border-slate-100 flex items-center gap-1.5">
                      <input
                        type="text"
                        disabled
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-50 px-2 py-1 text-[10px] rounded border border-slate-200 outline-none"
                      />
                      <div
                        className="w-5 h-5 rounded text-white flex items-center justify-center text-[10px]"
                        style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
                      >
                        &rarr;
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating Widget Trigger Button */}
                <button
                  onClick={() => setPreviewOpen(!previewOpen)}
                  className={`absolute bottom-3 ${
                    widgetPosition === 'bottom-left' ? 'left-3' : 'right-3'
                  } w-11 h-11 rounded-full text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-10`}
                  style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
                  title="Click to toggle live widget preview"
                >
                  <Bot className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
