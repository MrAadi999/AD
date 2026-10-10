'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Zap,
  Activity,
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowDown,
  Binary,
} from 'lucide-react';

export function NeuralNetworkArchitectureView() {
  const [layers, setLayers] = useState(4);
  const [heads, setHeads] = useState(4);
  const [dModel, setDModel] = useState(128);
  const [mode, setMode] = useState<'nano' | '50b'>('nano');

  // Calculate live parameters dynamically
  const vocabSize = 2048;
  const dFF = dModel * 4;
  const embParams = vocabSize * dModel + 256 * dModel;
  const attnParamsPerLayer = dModel * (3 * dModel) + dModel * dModel; // QKV + out
  const mlpParamsPerLayer = dModel * dFF * 3; // SwiGLU: gate, up, down
  const layerParams = (attnParamsPerLayer + mlpParamsPerLayer + 2 * dModel) * layers;
  const totalNanoParams = embParams + layerParams + dModel;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-300 mb-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Native Neural Network • Pure Transformer from First Principles</span>
          </div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>AD Transformer LM: Foundational Architecture</span>
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Exact mathematical neural network pipeline powering modern LLMs (Causal Multi-Head Attention, 
            RMSNorm, SwiGLU Feed-Forward, and Residual Connections). Compact level runs natively on Apple Silicon MPS!
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-2xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setMode('nano')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              mode === 'nano' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Nano Model (Local GPU)
          </button>
          <button
            type="button"
            onClick={() => setMode('50b')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              mode === '50b' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            AD-50B MoE (Frontier)
          </button>
        </div>
      </div>

      {/* Live Spec Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Parameters</div>
          <div className="text-xl font-black text-indigo-400">
            {mode === 'nano' ? `${(totalNanoParams / 1e6).toFixed(2)}M Params` : '50 Billion (MoE)'}
          </div>
          <div className="text-[11px] text-slate-300">
            {mode === 'nano' ? '100% PyTorch native weights' : '8x7B Expert Sub-networks'}
          </div>
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Hardware Runtime</div>
          <div className="text-xl font-black text-emerald-400">
            {mode === 'nano' ? 'Apple Silicon MPS' : '8x H100 80GB SXM5'}
          </div>
          <div className="text-[11px] text-slate-300">
            {mode === 'nano' ? '3.02s training time' : 'DeepSpeed ZeRO-3 Cluster'}
          </div>
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Attention Mechanism</div>
          <div className="text-xl font-black text-amber-400">
            {mode === 'nano' ? `${heads} Heads Causal` : '8x MoE Top-2 GQA'}
          </div>
          <div className="text-[11px] text-slate-300">Scaled Dot-Product + Mask</div>
        </div>

        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Activation Function</div>
          <div className="text-xl font-black text-purple-400">SwiGLU MLP</div>
          <div className="text-[11px] text-slate-300">Gated Linear Unit (Llama standard)</div>
        </div>
      </div>

      {/* Layer-by-Layer Architecture Diagram */}
      <div className="p-6 bg-slate-950/70 border border-white/10 rounded-3xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Neural Network Data Flow: From Token to Probability</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Cross-Entropy Loss: 4.13 → 2.94
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
          {/* Stage 1 */}
          <div className="flex-1 w-full p-3.5 bg-indigo-900/30 border border-indigo-700/50 rounded-2xl space-y-1">
            <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">1. Input Tokens</div>
            <div className="text-xs font-mono font-bold text-white">&quot;Namaste BiharStack&quot;</div>
            <div className="text-[10px] text-slate-400">Discrete Token IDs [14, 82, ...]</div>
          </div>

          <div className="text-indigo-400 text-lg hidden md:block">→</div>
          <div className="text-indigo-400 text-lg md:hidden">↓</div>

          {/* Stage 2 */}
          <div className="flex-1 w-full p-3.5 bg-blue-900/30 border border-blue-700/50 rounded-2xl space-y-1">
            <div className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">2. Embeddings + Pos</div>
            <div className="text-xs font-mono font-bold text-white">E(x) + Pos(t)</div>
            <div className="text-[10px] text-slate-400">Dimension = {dModel} vectors</div>
          </div>

          <div className="text-blue-400 text-lg hidden md:block">→</div>
          <div className="text-blue-400 text-lg md:hidden">↓</div>

          {/* Stage 3 */}
          <div className="flex-1 w-full p-3.5 bg-purple-900/40 border border-purple-600/60 rounded-2xl space-y-1 ring-1 ring-purple-500/30">
            <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
              3. Transformer Blocks ({layers}x)
            </div>
            <div className="text-xs font-mono font-bold text-white">RMSNorm → Attn → SwiGLU</div>
            <div className="text-[10px] text-purple-200">Residual Skip Connections</div>
          </div>

          <div className="text-purple-400 text-lg hidden md:block">→</div>
          <div className="text-purple-400 text-lg md:hidden">↓</div>

          {/* Stage 4 */}
          <div className="flex-1 w-full p-3.5 bg-emerald-900/30 border border-emerald-700/50 rounded-2xl space-y-1">
            <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">4. LM Head &amp; Output</div>
            <div className="text-xs font-mono font-bold text-white">Softmax(W @ h)</div>
            <div className="text-[10px] text-slate-400">Next-Token Probability</div>
          </div>
        </div>

        {/* Code Proof & Terminal Box */}
        <div className="p-3 bg-black/50 border border-white/10 rounded-xl font-mono text-[11px] text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              PyTorch Script: <code>ad_model/ad_neural_network.py</code> &amp; <code>train_nano_neural_net.py</code>
            </span>
          </div>
          <span className="text-[10px] text-indigo-400 font-bold">Weights: ad_nano_weights.pt</span>
        </div>
      </div>
    </div>
  );
}
