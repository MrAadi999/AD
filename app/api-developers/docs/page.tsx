'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeveloperNav } from '@/components/developer/DeveloperNav';
import { CodeBlock } from '@/components/developer/CodeBlock';
import {
  BookOpen,
  KeyRound,
  MessageSquare,
  Bot,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const curlChatSnippet = [
    {
      label: 'cURL',
      language: 'bash',
      code: `curl -X POST https://api.biharstack.ai/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bot_id": "bs_bot_a1b2c3d4e5f6",
    "message": "What services do you provide?"
  }'`,
    },
    {
      label: 'JavaScript',
      language: 'javascript',
      code: `const response = await fetch("https://api.biharstack.ai/v1/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    bot_id: "bs_bot_a1b2c3d4e5f6",
    message: "What services do you provide?"
  })
});

const data = await response.json();
console.log(data.message);`,
    },
    {
      label: 'Python',
      language: 'python',
      code: `import requests

url = "https://api.biharstack.ai/v1/chat"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "bot_id": "bs_bot_a1b2c3d4e5f6",
    "message": "What services do you provide?"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print(data["message"])`,
    },
    {
      label: 'Node.js',
      language: 'javascript',
      code: `const https = require('https');

const data = JSON.stringify({
  bot_id: 'bs_bot_a1b2c3d4e5f6',
  message: 'What services do you provide?'
});

const req = https.request('https://api.biharstack.ai/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(JSON.parse(body)));
});

req.write(data);
req.end();`,
    },
    {
      label: 'PHP',
      language: 'php',
      code: `<?php
$ch = curl_init('https://api.biharstack.ai/v1/chat');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'bot_id' => 'bs_bot_a1b2c3d4e5f6',
    'message' => 'What services do you provide?'
]));

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
echo $result['message'];
?>`,
    },
  ];

  const chatSuccessResponse = [
    {
      label: 'JSON Response (200 OK)',
      language: 'json',
      code: `{
  "id": "msg_9f2a4b8c1d",
  "object": "chat.response",
  "bot_id": "bs_bot_a1b2c3d4e5f6",
  "message": "BiharStack AI provides autonomous 24/7 AI Chatbots, intelligent workflow automations, and custom software tailored for businesses in Bihar and India.",
  "sources": [
    {
      "title": "Services & Offerings",
      "url": "https://biharstack.com/services"
    }
  ],
  "usage": {
    "input_tokens": 8,
    "output_tokens": 36,
    "total_tokens": 44
  },
  "created_at": "2026-09-28T14:30:00.000Z",
  "request_id": "req_7f8a9b0c"
}`,
    },
  ];

  const errorResponseSnippet = [
    {
      label: 'JSON Error Response (401)',
      language: 'json',
      code: `{
  "error": {
    "code": "invalid_api_key",
    "message": "The provided API key does not exist or is invalid."
  },
  "request_id": "req_3a2b1c4d"
}`,
    },
  ];

  const navItems = [
    { id: 'introduction', label: 'Introduction', icon: BookOpen },
    { id: 'authentication', label: 'Authentication', icon: KeyRound },
    { id: 'chat-api', label: 'Chat API', icon: MessageSquare },
    { id: 'chatbots-api', label: 'Chatbots API', icon: Bot },
    { id: 'errors', label: 'Errors & Status Codes', icon: AlertTriangle },
    { id: 'rate-limits', label: 'Rate Limits', icon: Clock },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-6xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              API Documentation & Reference
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Complete guide to integrating BiharStack AI chatbots into your applications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/api-developers/keys"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Get API Key
            </Link>
            <Link
              href="/api-developers/playground"
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold"
            >
              API Playground
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <DeveloperNav />

        {/* Two-Column Doc Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Left Sticky Sidebar */}
          <div className="hidden lg:block sticky top-6 bg-white border border-[#E6EBF2] rounded-3xl p-4 shadow-subtle space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              API Reference
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Documentation Articles */}
          <div className="lg:col-span-3 space-y-12">
            {/* Section 1: Introduction */}
            <section id="introduction" className="space-y-4 scroll-mt-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Introduction
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Connect your web applications, internal tools, and microservices directly to BiharStack AI.
                </p>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                <p>
                  The BiharStack AI REST API allows programmatic access to your custom trained
                  chatbots. All responses are strictly grounded in your website knowledge base using
                  retrieval-augmented generation (RAG).
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Base API URL
                </div>
                <div className="font-mono text-xs font-bold text-slate-900">
                  https://api.biharstack.ai/v1
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  (Or local endpoint <code className="font-mono text-blue-600">http://localhost:3000/v1</code>)
                </div>
              </div>
            </section>

            {/* Section 2: Authentication */}
            <section id="authentication" className="space-y-4 scroll-mt-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Authentication
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Authenticate requests using Bearer secret tokens.
                </p>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                <p>
                  All API requests must include your secret API key in the{' '}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">
                    Authorization
                  </code>{' '}
                  header formatted as a Bearer token:
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800">
                Authorization: Bearer bs_live_xxxxxxxxxxxxxxxxxxxxxxxx
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Key Environments
                </div>
                <p className="text-[11px] text-blue-900">
                  • <strong>Live Keys:</strong> Prefix <code className="font-mono font-bold">bs_live_</code> for production workflows.<br />
                  • <strong>Test Keys:</strong> Prefix <code className="font-mono font-bold">bs_test_</code> for local development and sandbox testing.
                </p>
              </div>
            </section>

            {/* Section 3: Chat API */}
            <section id="chat-api" className="space-y-4 scroll-mt-6">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white">
                    POST
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">/v1/chat</span>
                </div>
                <p className="text-xs text-slate-500">
                  Send a visitor question to your chatbot and receive a grounded answer with citations.
                </p>
              </div>

              {/* Parameters Table */}
              <div className="bg-white border border-[#E6EBF2] rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Request Body (JSON)
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">bot_id</span>
                      <span className="ml-2 text-[10px] font-bold text-rose-600 uppercase">
                        Required
                      </span>
                      <p className="text-slate-500 mt-1">
                        The public bot ID (e.g. <code className="font-mono">bs_bot_xxxxxxxxx</code>) or chatbot UUID. Must belong to your workspace.
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">string</span>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">message</span>
                      <span className="ml-2 text-[10px] font-bold text-rose-600 uppercase">
                        Required
                      </span>
                      <p className="text-slate-500 mt-1">
                        The visitor question or inquiry (maximum 4000 characters).
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">string</span>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">session_id</span>
                      <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">
                        Optional
                      </span>
                      <p className="text-slate-500 mt-1">
                        Unique session identifier to maintain conversation history across multiple turns.
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">string</span>
                  </div>
                </div>
              </div>

              {/* Code Examples */}
              <CodeBlock snippets={curlChatSnippet} title="Chat Request" />

              {/* Response Example */}
              <CodeBlock snippets={chatSuccessResponse} title="Response" />
            </section>

            {/* Section 4: Chatbots API */}
            <section id="chatbots-api" className="space-y-4 scroll-mt-6">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white">
                    GET
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">/v1/chatbots</span>
                </div>
                <p className="text-xs text-slate-500">
                  List all active chatbots configured in your workspace.
                </p>
              </div>

              <CodeBlock
                snippets={[
                  {
                    label: 'cURL',
                    language: 'bash',
                    code: `curl https://api.biharstack.ai/v1/chatbots \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
                  },
                ]}
                title="List Chatbots"
              />
            </section>

            {/* Section 5: Errors & Diagnostics */}
            <section id="errors" className="space-y-4 scroll-mt-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Errors & Diagnostics
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Standard error codes and troubleshooting recommendations.
                </p>
              </div>

              <div className="bg-white border border-[#E6EBF2] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3">HTTP Status</th>
                      <th className="px-4 py-3">Error Code</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr>
                      <td className="px-4 py-3 font-bold text-rose-600">401</td>
                      <td className="px-4 py-3 text-slate-800">invalid_api_key</td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        The key does not exist or was incorrectly formatted.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-rose-600">401</td>
                      <td className="px-4 py-3 text-slate-800">revoked_api_key</td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        This key was revoked and cannot make further requests.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-rose-600">403</td>
                      <td className="px-4 py-3 text-slate-800">forbidden</td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        Chatbot belongs to a different workspace than your key.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-rose-600">403</td>
                      <td className="px-4 py-3 text-slate-800">chatbot_inactive</td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        The chatbot is currently paused by the workspace owner.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-rose-600">404</td>
                      <td className="px-4 py-3 text-slate-800">chatbot_not_found</td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        No chatbot matches the provided bot_id.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-purple-600">429</td>
                      <td className="px-4 py-3 text-slate-800">rate_limit_exceeded</td>
                      <td className="px-4 py-3 font-sans text-slate-600">
                        Exceeded 100 requests/minute. Inspect Retry-After header.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <CodeBlock snippets={errorResponseSnippet} title="Error Format" />
            </section>

            {/* Section 6: Rate Limits */}
            <section id="rate-limits" className="space-y-4 scroll-mt-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Rate Limits
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  API quotas, sliding windows, and response headers.
                </p>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed space-y-3">
                <p>
                  By default, each API key is permitted up to <strong>100 requests per minute</strong> in a
                  continuous sliding window. Every API response includes informative rate-limit
                  headers:
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs font-mono">
                <div><span className="text-blue-600 font-bold">X-RateLimit-Limit:</span> 100</div>
                <div><span className="text-blue-600 font-bold">X-RateLimit-Remaining:</span> 94</div>
                <div><span className="text-blue-600 font-bold">X-RateLimit-Reset:</span> 1727532600</div>
                <div><span className="text-purple-600 font-bold">Retry-After:</span> 14 (on HTTP 429)</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
