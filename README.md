# ⚡ AD (BiharStack AI) — Enterprise AI Agent & Proprietary Model Suite

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-13.5%2B-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Deep%20Learning-EE4C2C?style=for-the-badge&logo=pytorch)](https://pytorch.org/)
[![vLLM](https://img.shields.io/badge/vLLM-High%20Throughput%20Serving-purple?style=for-the-badge)](https://vllm.ai/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Turn any website or business knowledge base into an intelligent, autonomous AI chatbot & agent in under 2 minutes.**  
*Powered by a full-stack Next.js web application and the proprietary, self-evolving **"AD"** Neural Model.*

[Features](#-key-features) • [Architecture](#-system-architecture) • [Quick Start](#-quick-start-guide) • [AD Model Suite](#-proprietary-ad-model-suite) • [Developer API](#-developer-api--platform) • [Project Structure](#-project-structure)

</div>

---

## 🌟 Executive Summary

**AD (BiharStack AI)** is an end-to-end, production-grade Artificial Intelligence platform that bridges high-performance web applications with state-of-the-art neural intelligence.

The platform provides a dual-core capability:
1. **The Web & Agent Platform**: A full-stack Next.js App Router ecosystem enabling businesses to crawl websites, ingest knowledge bases with vector search (RAG), deploy customizable embeddable chat widgets, orchestrate autonomous multi-agent systems, and expose secure developer APIs with rate limiting and usage metrics.
2. **The Proprietary "AD" Neural Engine**: A dedicated machine learning and fine-tuning suite capable of synthetic multi-turn dataset generation (millions of tokens), 4-bit Unsloth QLoRA fine-tuning, 50B Mixture-of-Experts (MoE) distributed training via DeepSpeed ZeRO-3, vLLM OpenAI-compatible serving, and autonomous self-evolution with GitHub-synced memory.

---

## 🚀 Key Features

### 🤖 1. Autonomous AI Chatbots & Multi-Agent Orchestration
- **Visual Bot Builder**: Create, brand, and configure custom AI chatbots with personality, system instructions, and welcome messages.
- **Agent Action Engine**: Multi-agent execution runtime capable of tool calling, goal planning, and real-time execution steps.
- **Dual-Engine LLM Router**: Prioritizes the custom on-premise **AD Model** with instant, zero-downtime fallback to Gemini 1.5 Flash / GPT-4o.

### 🌐 2. Deep Web Crawler & SSRF-Protected Knowledge Base
- **Intelligent Crawler**: Ingests whole domains, sitemaps, Framer sites, and Next.js hydrated applications with SSRF prevention and robots.txt compliance.
- **RAG & Vector Retrieval**: Automatic text cleaning, semantic chunking, and dense vector embeddings (Google `text-embedding-004` / OpenAI `text-embedding-3-small`) stored in Supabase pgvector.
- **Business Synthesizer**: Extracts FAQs, operating hours, pricing tables, and core policies directly from raw crawls.

### 💻 3. Embeddable Widget & Omnichannel Deployment
- **Plug-and-Play Script**: Single-line `<script>` tag embedding for any HTML/React/WordPress site.
- **Customizable UI**: Custom themes, accent colors, bot avatar, placement (bottom-right / bottom-left), and sound alerts.
- **Security & Domain Allowlisting**: Restrict widget communication strictly to verified customer domains with per-minute rate limiting.

### 🔑 4. Developer Platform & Public API
- **API Key Management**: Secure hashing, key generation (`sk_live_...`), revocation, and scoped permissions.
- **Developer Playground & Interactive Docs**: Built-in interactive console for testing streaming completions directly from the dashboard.
- **Real-Time Telemetry**: Latency tracking, token consumption, request ID tracing, and granular request logs.

### 🧠 5. Proprietary "AD" Neural Model Suite (`ad_model/`)
- **Synthetic Data Engine**: Ultra-fast generator producing millions of multilingual (Hindi, Hinglish, English) domain-specific reasoning pairs.
- **Unsloth 4-bit QLoRA Training**: Ultra-efficient fine-tuning on Qwen 2.5 7B / Llama 3.1 8B with 70% VRAM savings.
- **50B MoE Scale Architecture**: Slurm cluster scripts & DeepSpeed ZeRO-3 configuration for large-scale Mixture of Experts training.
- **High-Throughput Serving**: Low-latency vLLM inference server exposing OpenAI-compatible endpoints (`/v1/chat/completions`).
- **Autonomous Self-Evolution**: DPO curation and Git-backed persistent memory synchronization.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend & Client Interfaces"]
        W["Embeddable Website Widget (widget.js)"]
        UI["Next.js 13+ Dashboard & Portal"]
        DevAPI["Developer SDK / External API Client"]
    end

    subgraph SecurityLayer["Gateway & Security Guard"]
        TG["Tenant Guard & Auth Context (Supabase SSR)"]
        RL["Rate Limiter & Domain Validator"]
        SSRF["SSRF Defense & URL Sanitizer"]
    end

    subgraph CoreServices["Next.js Core Engine (lib/)"]
        Crawler["Native Web Crawler (Framer / Hydrated DOM)"]
        Chunker["Semantic Chunker & Knowledge Processor"]
        VectorStore["Vector DB / RAG Retrieval (pgvector)"]
        AgentEngine["Autonomous Multi-Agent Orchestrator"]
        Router["Dual-Engine Model Router"]
    end

    subgraph NeuralLayer["AD Model & Inference Infrastructure (ad_model/)"]
        AD_Primary["Proprietary AD Model (vLLM / Port 8000)"]
        Fallback["Gemini 1.5 Flash / OpenAI Fallback"]
        SelfLearn["Self-Evolution & GitHub Memory Sync"]
        MoE["50B MoE DeepSpeed ZeRO-3 Cluster"]
    end

    ClientLayer --> SecurityLayer
    SecurityLayer --> CoreServices
    CoreServices --> Chunker
    Chunker --> VectorStore
    VectorStore --> Router
    Router -->|Primary| AD_Primary
    Router -->|Graceful Fallback| Fallback
    AD_Primary -.-> SelfLearn
```

---

## 🛠️ Tech Stack

| Domain | Technology / Library |
| :--- | :--- |
| **Frontend Framework** | [Next.js 13.5+ (App Router)](https://nextjs.org/) |
| **Language** | [TypeScript 5.6](https://www.typescriptlang.org/) & [Python 3.11+](https://python.org/) |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/), PostCSS, [Lucide Icons](https://lucide.dev/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + pgvector + Auth SSR) |
| **AI / Embeddings** | Google Gemini (`text-embedding-004`, `gemini-1.5-flash`), OpenAI API |
| **Model Fine-Tuning** | [Unsloth](https://github.com/unslothai/unsloth), Hugging Face TRL, PEFT, Accelerate |
| **Model Serving** | [vLLM](https://github.com/vllm-project/vllm), PyTorch |
| **Distributed Training** | DeepSpeed ZeRO-3, Slurm Multi-GPU Cluster |

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm** or **pnpm**
- **Python**: `3.10+` (for crawler & AD model suite)
- **Supabase Account**: A Supabase project with `pgvector` enabled.

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/MrAadi999/AD.git
cd AD
```

### Step 2: Install Dependencies
```bash
# Install frontend & API dependencies
npm install

# (Optional) Install Python crawler dependencies
pip install -r crawler/requirements.txt # or pip install httpx beautifulsoup4 lxml
```

### Step 3: Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration keys:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App & Public URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WIDGET_URL=http://localhost:3000/widget.js

# AI & Embeddings
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=text-embedding-004
GEMINI_API_KEY=your-gemini-api-key

# LLM Selection
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash

# AD Model Integration (Optional if serving locally)
AD_MODEL_ENDPOINT=http://localhost:8000/v1
AD_MODEL_NAME=ad-model
```

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧬 Proprietary AD Model Suite

The `ad_model/` directory houses the entire pipeline for training and deploying the custom **AD** AI model.

```
ad_model/
├── 01_synthetic_dataset_generator.py  # Teacher-student synthetic generator
├── 02_train_ad_unsloth.py             # 4-bit QLoRA fine-tuning script
├── 03_serve_ad_vllm.sh                # High-throughput vLLM serving script
├── 04_evaluate_ad.py                  # Evaluation & benchmark suite
├── 05_train_ad_50b_moe.py             # 50B MoE cluster training script
├── generate_ultra_dataset.py          # Combinatorial multi-turn dataset engine
├── ad_neural_network.py               # Custom neural network definition
├── self_evolution_pipeline.py         # Autonomous self-evolution loop
├── sync_memory_github.py              # Git-backed persistent memory sync
└── configs/
    ├── ds_zero3_50b.json              # DeepSpeed ZeRO-3 configuration
    ├── accelerate_config_50b.yaml     # Hugging Face Accelerate multi-GPU config
    └── train_50b_cluster.slurm        # Slurm job scheduler script
```

### 1. Generate Synthetic Datasets
Generate millions of tokens covering business domains (E-commerce, Healthcare, SaaS, Real Estate) and dialects (Hindi, Hinglish, English):
```bash
# Generate 100k compressed samples in seconds:
python3 ad_model/generate_ultra_dataset.py 100000 ad_model/ad_train_dataset_100k.jsonl.gz
```

### 2. Fine-Tune with Unsloth (Local GPU or Colab)
```bash
python3 ad_model/02_train_ad_unsloth.py
```
*Optimized for NVIDIA RTX 3090 / 4090 / A100. Uses 70% less VRAM and trains 2x faster than standard PyTorch.*

### 3. Launch the vLLM OpenAI-Compatible Server
```bash
chmod +x ad_model/03_serve_ad_vllm.sh
./ad_model/03_serve_ad_vllm.sh ./ad_model_checkpoints/ad_model_merged_16bit 8000
```
Your local model will now serve requests at `http://localhost:8000/v1/chat/completions`.

---

## 📡 Developer API & Platform

The platform exposes an OpenAI-compatible REST API for seamless third-party integrations:

### Chat Completion Request
```bash
curl -X POST https://your-domain.com/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -d '{
    "chatbot_id": "cb_9f823a10",
    "messages": [
      {
        "role": "user",
        "content": "What are your business opening hours?"
      }
    ],
    "stream": false
  }'
```

### Response
```json
{
  "id": "chatcmpl_88492041",
  "object": "chat.completion",
  "created": 1731140000,
  "model": "ad-model-v1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Our business is open Monday to Saturday from 9:00 AM to 7:00 PM IST."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 124,
    "completion_tokens": 22,
    "total_tokens": 146
  }
}
```

---

## 📂 Project Structure

```
.
├── ad_model/                 # Custom neural network, fine-tuning, and MoE suite
├── app/                      # Next.js 13+ App Router pages & APIs
│   ├── (auth)/               # Login, Signup, Forgot Password
│   ├── ai-agents/            # Multi-agent builder, execution runs & analytics
│   ├── analytics/            # Token consumption, queries, and engagement stats
│   ├── api/                  # Internal & public API routes (chat, crawl, v1)
│   ├── api-developers/       # Developer portal, API key manager & playground
│   ├── billing/              # Subscription & plan management
│   ├── chatbots/             # Chatbot creator, knowledge mapper, appearance
│   ├── clients/              # CRM & client integration management
│   ├── dashboard/            # Overview metrics & quick action hub
│   ├── integrations/         # Slack, WhatsApp, Webhooks, WordPress connectors
│   └── knowledge-base/       # Crawler dashboard & vector document management
├── components/               # Modular UI components
│   ├── cards/                # Metrics, upgrades, activity feeds
│   ├── chatbot/              # Multi-step bot creation wizard
│   ├── developer/            # Code block viewer, key modals
│   ├── layout/               # Header, sidebar, dashboard layouts
│   └── neural/               # Real-time neural network architecture visualizer
├── crawler/                  # High-speed Python crawler with SSRF & JS extractors
├── lib/                      # Core business logic & services
│   ├── agents/               # Autonomous multi-agent action engine
│   ├── business/             # Industry blueprints & outcome tracking
│   ├── chat/                 # RAG retrieval, context builder, prompt composer
│   ├── crawler/              # Native TypeScript crawler runner & smart analyzer
│   ├── developer/            # Rate limiting, usage tracking, key service
│   ├── embeddings/           # Vector embeddings service (Gemini / OpenAI)
│   ├── knowledge/            # Vector store, chunking, business synthesis
│   ├── security/             # Tenant isolation & security guards
│   └── supabase/             # Database clients (client, server, middleware)
├── public/                   # Static assets, branding, and widget scripts
└── supabase/                 # Supabase database migrations & schemas
```

---

## 🛡️ Security & Enterprise Readiness

- **Tenant Isolation**: Row-Level Security (RLS) and Tenant Guards ensure data is partitioned strictly per workspace.
- **SSRF Hardened Crawler**: Private IP ranges (e.g., `10.0.0.0/8`, `127.0.0.1`, cloud metadata endpoints) are blocked at the networking layer.
- **Encrypted Secrets**: All external API keys and client credentials are authenticated securely and never exposed to the client.
- **DDoS & Abuse Protection**: Token bucket rate limiting applied to both embeddable widgets and developer APIs.

---

## 🤝 Contributing

Contributions are warmly welcome! To contribute:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'feat: add amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ by <a href="https://github.com/MrAadi999">Aditya Kumar (MrAadi999)</a> • Powering the next generation of conversational AI.
</div>
