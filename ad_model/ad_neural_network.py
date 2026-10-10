#!/usr/bin/env python3
"""
AD Model - Native Neural Network & Transformer Language Model (from Scratch)
Author: BiharStack AI / AD Deep Cognition Laboratory

Purpose:
A foundational, pure PyTorch Transformer Neural Network built from first principles.
Implements the exact mathematical architecture of frontier LLMs (Llama 3 / Qwen / GPT-4),
scaled to a lightweight 'Nano/Micro' level that runs and trains instantly on Mac Apple Silicon (MPS/CPU).

Key Architectural Components:
1. RMSNorm (Root Mean Square Layer Normalization)
2. Causal Multi-Head Self-Attention with Scaled Dot-Product & Triangular Mask
3. SwiGLU / GeLU Gated Feed-Forward Network (MLP)
4. Residual Skip Connections
5. Language Model Head with Weight Tying
6. Autoregressive Sampling Generator (Greedy, Top-k, Temperature)
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class RMSNorm(nn.Module):
    """Modern pre-layer normalization used in frontier models (Llama 3, Qwen 2.5)"""
    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        variance = x.pow(2).mean(-1, keepdim=True)
        return x * torch.rsqrt(variance + self.eps) * self.weight

class CausalSelfAttention(nn.Module):
    """Multi-Head Causal Attention with lower-triangular autoregressive masking"""
    def __init__(self, d_model: int, n_heads: int, max_seq_len: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0, "d_model must be divisible by n_heads"
        self.d_model = d_model
        self.n_heads = n_heads
        self.d_head = d_model // n_heads

        # Q, K, V combined linear projection for high efficiency
        self.qkv_proj = nn.Linear(d_model, 3 * d_model, bias=False)
        self.out_proj = nn.Linear(d_model, d_model, bias=False)
        self.dropout = nn.Dropout(dropout)

        # Causal mask: tokens cannot look into the future
        self.register_buffer(
            "mask",
            torch.tril(torch.ones(max_seq_len, max_seq_len)).view(1, 1, max_seq_len, max_seq_len)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.size()

        # Project and split into Query, Key, Value
        qkv = self.qkv_proj(x)
        q, k, v = qkv.chunk(3, dim=-1)

        # Reshape to (Batch, Heads, Time, Head_Dim)
        q = q.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.d_head).transpose(1, 2)

        # Scaled Dot-Product Attention: Attn = softmax(Q * K^T / sqrt(d_k) + Mask)
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_head)
        scores = scores.masked_fill(self.mask[:, :, :T, :T] == 0, float("-inf"))
        attn_weights = F.softmax(scores, dim=-1)
        attn_weights = self.dropout(attn_weights)

        # Weighted aggregation with Values
        out = attn_weights @ v
        out = out.transpose(1, 2).contiguous().view(B, T, C)

        return self.out_proj(out)

class SwiGLUMLP(nn.Module):
    """Swish-Gated Linear Unit Feed-Forward Network"""
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.w_gate = nn.Linear(d_model, d_ff, bias=False)
        self.w_up = nn.Linear(d_model, d_ff, bias=False)
        self.w_down = nn.Linear(d_ff, d_model, bias=False)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # SwiGLU activation: (Silu(w_gate(x)) * w_up(x))
        gated = F.silu(self.w_gate(x)) * self.w_up(x)
        return self.dropout(self.w_down(gated))

class TransformerBlock(nn.Module):
    """Single Transformer Decoder Layer with Pre-Norm and Residual Connections"""
    def __init__(self, d_model: int, n_heads: int, d_ff: int, max_seq_len: int, dropout: float = 0.1):
        super().__init__()
        self.norm1 = RMSNorm(d_model)
        self.attn = CausalSelfAttention(d_model, n_heads, max_seq_len, dropout)
        self.norm2 = RMSNorm(d_model)
        self.mlp = SwiGLUMLP(d_model, d_ff, dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Pre-LN Residual: x = x + Attention(Norm(x))
        x = x + self.attn(self.norm1(x))
        # Pre-LN Residual: x = x + MLP(Norm(x))
        x = x + self.mlp(self.norm2(x))
        return x

class ADTransformerLM(nn.Module):
    """
    Complete Autoregressive Language Model Neural Network (AD Model Core)
    """
    def __init__(
        self,
        vocab_size: int = 2048,
        d_model: int = 128,
        n_layers: int = 4,
        n_heads: int = 4,
        d_ff: int = 512,
        max_seq_len: int = 256,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.vocab_size = vocab_size
        self.max_seq_len = max_seq_len
        self.d_model = d_model

        # 1. Embedding Layers
        self.tok_emb = nn.Embedding(vocab_size, d_model)
        self.pos_emb = nn.Embedding(max_seq_len, d_model)
        self.drop = nn.Dropout(dropout)

        # 2. Transformer Decoder Stack
        self.blocks = nn.ModuleList([
            TransformerBlock(d_model, n_heads, d_ff, max_seq_len, dropout)
            for _ in range(n_layers)
        ])

        # 3. Final Normalization & LM Head
        self.norm_f = RMSNorm(d_model)
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)

        # Weight tying: share weights between input embeddings and output projection
        self.lm_head.weight = self.tok_emb.weight

        # Parameter initialization
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx: torch.Tensor, targets: torch.Tensor = None):
        B, T = idx.size()
        assert T <= self.max_seq_len, f"Sequence length {T} exceeds max context {self.max_seq_len}"

        positions = torch.arange(0, T, device=idx.device)
        
        # Token Embeddings + Positional Embeddings
        x = self.tok_emb(idx) + self.pos_emb(positions)
        x = self.drop(x)

        # Pass through Transformer blocks
        for block in self.blocks:
            x = block(x)

        # Final RMSNorm
        x = self.norm_f(x)
        logits = self.lm_head(x)

        loss = None
        if targets is not None:
            # Flatten cross-entropy loss over all tokens
            loss = F.cross_entropy(logits.view(-1, self.vocab_size), targets.view(-1))

        return logits, loss

    @torch.no_grad()
    def generate(self, idx: torch.Tensor, max_new_tokens: int = 50, temperature: float = 0.8, top_k: int = 10) -> torch.Tensor:
        """Autoregressive token generation"""
        self.eval()
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -self.max_seq_len:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / max(0.01, temperature)

            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float("inf")

            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)

        return idx

def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

if __name__ == "__main__":
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print("=" * 70)
    print("  🧠 AD MODEL - FOUNDATIONAL NEURAL NETWORK ARCHITECTURE")
    print("=" * 70)
    print(f"Device:               {device.upper()} (Apple Silicon Accelerated)")
    
    # Initialize compact instance
    model = ADTransformerLM(
        vocab_size=2048,
        d_model=128,
        n_layers=4,
        n_heads=4,
        d_ff=512,
        max_seq_len=256
    ).to(device)

    total_params = count_parameters(model)
    print(f"Total Neural Parameters: {total_params:,} ({total_params / 1e6:.2f} Million Parameters)")
    print(f"Embedding Dim (d_model): 128")
    print(f"Attention Heads:         4")
    print(f"Transformer Layers:      4 Blocks")
    print(f"Feed-Forward Dim (d_ff): 512 (SwiGLU)")
    print(f"Context Window:          256 Tokens")
    print("-" * 70)

    # Test forward pass with dummy batch
    dummy_input = torch.randint(0, 2048, (2, 32), device=device)
    dummy_targets = torch.randint(0, 2048, (2, 32), device=device)
    
    logits, loss = model(dummy_input, targets=dummy_targets)
    print(f"[✓] Forward Pass Test: Logits Shape = {list(logits.shape)}, Loss = {loss.item():.4f}")

    # Test token generation
    prompt = torch.randint(0, 2048, (1, 5), device=device)
    out_tokens = model.generate(prompt, max_new_tokens=10)
    print(f"[✓] Autoregressive Generation Test: Generated {out_tokens.size(1)} tokens successfully!")
    print("=" * 70)
