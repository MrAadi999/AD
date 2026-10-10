#!/usr/bin/env python3
"""
AD Model - Train Foundational Nano Neural Network Locally
Author: BiharStack AI / AD Deep Cognition Laboratory

Trains the custom ADTransformerLM neural network on Indic & Hinglish enterprise conversational samples.
Runs directly on Mac Apple Silicon GPU (MPS) or CPU.
Demonstrates genuine gradient updates, backward passes, loss reduction, and checkpointing.
"""

import os
import time
import torch
import torch.optim as optim
from ad_neural_network import ADTransformerLM

# Simple character-level tokenizer for direct zero-dependency training
SAMPLE_CORPUS = """
Namaste! BiharStack AI ke AD Model me aapka swagat hai.
Hamare Diwali festive plans par special discount uplabdh hai.
Aapka order successfully dispatch ho chuka hai aur do din me deliver hoga.
Humein behad khed hai, complaint priority manager ko escalate kar di gayi hai.
Patna Mandi me aaj gehun ka certified rate 2275 rupaye quintal chal raha hai.
Kripya apna phone number aur email share karein taaki team contact kar sake.
Bhojpuri me baat kar sakat bani? Haan bilkul, raua kaisan madad chaheen?
"""

class SimpleCharTokenizer:
    def __init__(self, text: str):
        chars = sorted(list(set(text)))
        self.vocab = {ch: i + 1 for i, ch in enumerate(chars)}
        self.vocab["<pad>"] = 0
        self.inv_vocab = {i: ch for ch, i in self.vocab.items()}
        self.vocab_size = len(self.vocab)

    def encode(self, s: str):
        return [self.vocab.get(ch, 0) for ch in s]

    def decode(self, tokens):
        return "".join([self.inv_vocab.get(t, "") for t in tokens if t != 0])

def train_nano():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print("=" * 70)
    print("  🚀 TRAINING NATIVE AD TRANSFORMER NEURAL NETWORK")
    print("=" * 70)
    print(f"Device: {device.upper()}")

    tokenizer = SimpleCharTokenizer(SAMPLE_CORPUS)
    print(f"Vocabulary Size: {tokenizer.vocab_size} tokens")

    # Initialize compact Neural Network
    model = ADTransformerLM(
        vocab_size=tokenizer.vocab_size + 16,
        d_model=128,
        n_layers=4,
        n_heads=4,
        d_ff=512,
        max_seq_len=128,
        dropout=0.1
    ).to(device)

    data = torch.tensor(tokenizer.encode(SAMPLE_CORPUS), dtype=torch.long)
    seq_len = 64
    batch_size = 4
    
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
    
    print("\nStarting Training Loop (20 Iterations)...")
    model.train()
    start_time = time.time()

    for step in range(1, 21):
        # Generate random training batches
        ix = torch.randint(0, len(data) - seq_len - 1, (batch_size,))
        x = torch.stack([data[i:i + seq_len] for i in ix]).to(device)
        y = torch.stack([data[i + 1:i + seq_len + 1] for i in ix]).to(device)

        optimizer.zero_grad()
        logits, loss = model(x, targets=y)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        if step % 4 == 0 or step == 1:
            print(f"  • Step {step:02d}/20 | Cross-Entropy Loss: {loss.item():.4f}")

    elapsed = round(time.time() - start_time, 2)
    checkpoint_path = "ad_model/ad_nano_weights.pt"
    torch.save(model.state_dict(), checkpoint_path)
    print(f"\n[✓] Training Complete in {elapsed}s!")
    print(f"[✓] Neural Network Weights Saved to: {checkpoint_path}")
    print("=" * 70)

if __name__ == "__main__":
    train_nano()
