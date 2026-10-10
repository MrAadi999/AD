#!/usr/bin/env python3
"""
AD Model - Synthetic Training Dataset Generator
Generates high-quality instruction-tuning and conversation datasets
using Knowledge Distillation from Teacher LLMs (OpenAI GPT-4o, Gemini 1.5, or Claude).

Use-cases Covered:
1. Grounded Business RAG (Strict Zero Hallucination)
2. Conversational Hinglish, Hindi, and English customer interactions
3. Action & Lead Capture (Extracting phone numbers, emails, order inquiries)
4. Out-of-Scope boundary tests (Model politely declines instead of guessing)
"""

import os
import json
import time
import argparse
from typing import List, Dict, Any

# Ensure we have requests or google-generativeai / openai installed
try:
    import urllib.request
except ImportError:
    pass

PROMPT_TEMPLATE = """You are an expert AI Dataset Engineer creating high-quality training conversations for a specialized enterprise AI model named "AD".

AD is the intelligent assistant for {business_name} in the {industry} industry.

Here is the verified business knowledge context:
\"\"\"{context}\"\"\"

Generate {num_samples} realistic, varied multi-turn customer dialogues in ChatML format.
Include a mixture of:
1. Natural conversational Hinglish (e.g. "bhai pricing kya hai?", "contact number do please")
2. Polite Hindi (e.g. "क्या आप मुझे रिफंड पॉलिसी के बारे में बता सकते हैं?")
3. Professional English queries
4. Lead capture examples where the user leaves a phone or email and AD confirms it warmly
5. Grounded questions where AD quotes exact facts from the context
6. At least 1 question asking about something NOT in the context, where AD politely says it does not have that information and offers to connect to human support.

Output STRICTLY a JSON array of conversation objects in ChatML format:
[
  {{
    "messages": [
      {{"role": "system", "content": "You are AD, the intelligent official AI assistant for {business_name}."}},
      {{"role": "user", "content": "..."}},
      {{"role": "assistant", "content": "..."}}
    ]
  }}
]
"""

SAMPLE_SEED_CONTEXTS = [
    {
        "business_name": "BiharStack Digital Solutions",
        "industry": "Software & AI Solutions",
        "context": """BiharStack Digital Solutions offers enterprise AI chatbots, cloud automation, and web development.
Headquarters: Fraser Road, Patna, Bihar, 800001.
Contact Phone: +91 98765 43210 / Toll-Free: 1800 123 4567.
Support Email: support@biharstack.com. WhatsApp: +91 98765 43210.
Working Hours: Monday to Saturday, 9:00 AM to 7:00 PM IST.
Pricing Plans:
- Starter Bot: ₹2,499/month (Includes 5,000 messages, website crawler, lead capture).
- Growth Plan: ₹6,999/month (Includes 25,000 messages, CRM integration, WhatsApp bot).
- Enterprise Suite: ₹19,999/month (Unlimited messages, custom vector memory, dedicated account manager).
Refund Policy: 100% money-back guarantee within 14 days of activation if not completely satisfied."""
    },
    {
        "business_name": "Kavya Fashion & Lifestyle",
        "industry": "E-commerce & Retail",
        "context": """Kavya Fashion is an online boutique delivering traditional ethnic wear and modern apparel across India.
Customer Support Helpline: +91 87654 32109. Email: care@kavyafashion.in.
Order Tracking: Orders can be tracked with Order ID (e.g., #ORD-1092) via our live portal.
Delivery Time: 3 to 5 business days for metro cities, 5 to 7 days for regional areas. Free shipping above ₹999.
Return & Exchange Policy: 7-day hassle-free exchange for size or defects. Reverse pickup arranged at zero cost."""
    }
]

def generate_with_gemini(api_key: str, prompt: str) -> List[Dict[str, Any]]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096}
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        result = json.loads(response.read().decode("utf-8"))
        text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
        # Clean markdown codeblocks
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

def generate_with_openai(api_key: str, prompt: str) -> List[Dict[str, Any]]:
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        result = json.loads(response.read().decode("utf-8"))
        text = result["choices"][0]["message"]["content"].strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

def main():
    parser = argparse.ArgumentParser(description="Generate synthetic training dataset for AD model")
    parser.add_argument("--output", type=str, default="ad_train_dataset.jsonl", help="Output JSONL filename")
    parser.add_argument("--samples_per_seed", type=int, default=4, help="Number of samples per seed context")
    args = parser.parse_args()

    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not gemini_key and not openai_key:
        print("[!] No GEMINI_API_KEY or OPENAI_API_KEY found in environment.")
        print("[*] Creating bootstrap offline dataset with golden curated examples for AD...")
        golden_dataset = [
            {
                "messages": [
                    {"role": "system", "content": "You are AD, the intelligent AI assistant representing BiharStack Digital Solutions."},
                    {"role": "user", "content": "Bhai mujhe chatbot lagwana hai website par, starter plan kitne ka hai aur kya milta hai?"},
                    {"role": "assistant", "content": "Namaste! BiharStack ka Starter Bot plan ₹2,499/mahina hai. Isme aapko:\n• 5,000 monthly messages\n• Complete website crawler (jo aapki site se seekhta hai)\n• Automated lead capture\n\nAapko isme 14 dino ki 100% money-back guarantee bhi milti hai. Kya aap iska live demo dekhna chahenge?"}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are AD, the intelligent AI assistant representing BiharStack Digital Solutions."},
                    {"role": "user", "content": "Mera contact number 9876543210 hai, mujhe callback chahiye."},
                    {"role": "assistant", "content": "Shukriya! Aapka mobile number 9876543210 note kar liya gaya hai. BiharStack team working hours (Mon-Sat, 9 AM - 7 PM IST) me aapse jald hi sampark karegi. Tab tak ke liye agar aapka koi aur sawal ho, toh zaroor bataiye!"}
                ]
            },
            {
                "messages": [
                    {"role": "system", "content": "You are AD, the intelligent AI assistant representing BiharStack Digital Solutions."},
                    {"role": "user", "content": "Kya aap log flight ticket booking bhi karte hain?"},
                    {"role": "assistant", "content": "Ji nahi, BiharStack Digital Solutions enterprise AI chatbots, cloud automation aur web development services provide karta hai. Flight booking hamare services me shamil nahi hai. Aap chahein toh support@biharstack.com par hamari team se jud sakte hain."}
                ]
            }
        ]
        with open(args.output, "w", encoding="utf-8") as f:
            for item in golden_dataset:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        print(f"[✓] Golden dataset successfully written to {args.output} ({len(golden_dataset)} conversations).")
        return

    all_conversations = []
    print(f"[*] Starting synthetic data generation using Teacher LLM...")

    for i, seed in enumerate(SAMPLE_SEED_CONTEXTS, 1):
        prompt = PROMPT_TEMPLATE.format(
            business_name=seed["business_name"],
            industry=seed["industry"],
            context=seed["context"],
            num_samples=args.samples_per_seed
        )
        print(f"[*] Processing seed {i}/{len(SAMPLE_SEED_CONTEXTS)}: {seed['business_name']}...")
        try:
            if gemini_key:
                batch = generate_with_gemini(gemini_key, prompt)
            else:
                batch = generate_with_openai(openai_key, prompt)
            all_conversations.extend(batch)
            print(f"[✓] Generated {len(batch)} dialogues from seed {i}")
            time.sleep(1)
        except Exception as e:
            print(f"[!] Error generating for seed {i}: {e}")

    with open(args.output, "w", encoding="utf-8") as f:
        for conv in all_conversations:
            f.write(json.dumps(conv, ensure_ascii=False) + "\n")

    print(f"\n[🎉 SUCCESS] Total {len(all_conversations)} conversations generated and saved to '{args.output}'!")

if __name__ == "__main__":
    main()
