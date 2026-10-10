'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/supabase/auth-context';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { ChatbotService } from '@/lib/chatbot/service';
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  RotateCcw,
  BookOpen,
  AlertCircle,
  Plus,
  ShieldCheck,
} from 'lucide-react';

interface SourceCitation {
  title: string;
  url: string;
}

interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[];
  created_at?: string;
}

export default function ChatbotTestPage() {
  const params = useParams();
  const { workspace } = useAuth();
  const botId = params?.id as string;

  const [chatbot, setChatbot] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasKnowledge, setHasKnowledge] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load chatbot and existing conversation on mount
  useEffect(() => {
    const initChat = async () => {
      const wsId = workspace?.id || 'ws-demo-01';
      if (!botId) return;

      try {
        setLoading(true);
        // 1. Load chatbot config
        const botData = await ChatbotService.getChatbotById(wsId, botId);
        setChatbot(botData);

        // 2. Check knowledge stats
        const knowRes = await fetch(`/api/chatbots/${botId}/knowledge`);
        if (knowRes.ok) {
          const knowData = await knowRes.json();
          const totalChunks = knowData?.stats?.total_chunks || 0;
          const totalSources = knowData?.knowledge_sources?.length || 0;
          setHasKnowledge(totalChunks > 0 || totalSources > 0);
        }

        // 3. Load active conversation
        const convRes = await fetch(`/api/chatbots/${botId}/conversations`);
        if (convRes.ok) {
          const convData = await convRes.json();
          if (convData.active_conversation_id) {
            setConversationId(convData.active_conversation_id);
          }
          if (Array.isArray(convData.messages) && convData.messages.length > 0) {
            setMessages(convData.messages);
          } else if (botData) {
            // Set initial welcome message
            const welcome: MessageItem = {
              id: 'welcome-init',
              role: 'assistant',
              content:
                botData.welcome_message ||
                `Hello! I am ${botData.name || 'your AI assistant'}. How can I assist you today?`,
              created_at: new Date().toISOString(),
            };
            setMessages([welcome]);
          }
        }
      } catch (err) {
        console.error('Failed to initialize test chat:', err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [workspace?.id, botId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputMessage.trim();
    if (!cleanText || isSending) return;

    setErrorMessage(null);
    setInputMessage('');

    // Optimistically append user message
    const tempUserMsg: MessageItem = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: cleanText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_id: botId,
          message: cleanText,
          conversation_id: conversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }

      const assistantMsg: MessageItem = {
        id: data.message_id || 'msg-' + Date.now(),
        role: 'assistant',
        content: data.message,
        sources: data.sources || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setConversationId(null);
    setErrorMessage(null);
    if (chatbot) {
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content:
            chatbot.welcome_message ||
            `Hello! I am ${chatbot.name}. How can I assist you with our services today?`,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading AI chat engine...</span>
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
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-130px)] space-y-3 text-left">
        {/* Top Header Card */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl px-5 py-3.5 shadow-subtle flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={`/chatbots/${botId}`}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              title="Back to Overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div
              className="w-9 h-9 rounded-xl text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
            >
              {(chatbot.name || 'B').charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                  {chatbot.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Test Chat • Grounded RAG Engine • {chatbot.tone} tone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
              title="Start a fresh conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Empty Knowledge State Banner */}
        {!hasKnowledge && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-shrink-0 animate-in fade-in">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-900">
                  Your AI doesn&apos;t have any knowledge yet.
                </h3>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Crawl and process your website content so your assistant can answer with real facts.
                </p>
              </div>
            </div>
            <Link
              href={`/chatbots/${botId}/knowledge?teach=true`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Teach Your AI</span>
            </Link>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 bg-white border border-[#E6EBF2] rounded-2xl p-5 overflow-y-auto space-y-5 shadow-subtle">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div
                    className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5"
                    style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-2 max-w-[82%] sm:max-w-[75%]`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm font-sans'
                        : 'bg-slate-50 text-slate-800 rounded-tl-xs border border-slate-100 font-sans'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Grounded Sources Cards */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="pt-1 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Sources
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] text-slate-700 transition-colors shadow-2xs group"
                          >
                            <span className="font-medium truncate max-w-[180px]">
                              {src.title}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking State */}
          {isSending && (
            <div className="flex gap-3 justify-start items-center">
              <div
                className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs"
                style={{ backgroundColor: chatbot.brand_color || '#2563EB' }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>AI is thinking...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => handleSendMessage()}
                className="text-xs font-semibold text-red-800 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="bg-white border border-[#E6EBF2] rounded-2xl p-2.5 shadow-subtle flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AI anything..."
              className="flex-1 max-h-32 min-h-[38px] p-2 bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none resize-none font-sans leading-relaxed"
            />

            <button
              type="submit"
              disabled={isSending || !inputMessage.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:hover:bg-blue-600 flex-shrink-0"
              title="Send Message"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          <div className="px-2 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>Press Enter to send, Shift + Enter for newline</span>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Grounded in website knowledge</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
