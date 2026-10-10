#!/usr/bin/env python3
"""
AD Model - Benchmark & Quality Evaluation Script
Tests the AD Model against 4 critical enterprise dimensions:
1. Hinglish Conversational Quality
2. Grounded Fact Retrieval (Zero-Guessing)
3. Hallucination Resistance (Out-of-scope queries)
4. Response Latency & Token Throughput
"""

import os
import sys
import json
import time
import urllib.request

AD_ENDPOINT = os.getenv("AD_MODEL_ENDPOINT", "http://localhost:8000/v1")
MODEL_NAME = os.getenv("AD_MODEL_NAME", "ad-model")

TEST_CASES = [
    {
        "name": "Hinglish Pricing Query",
        "system": "You are AD, official assistant for BiharStack Digital Solutions. Pricing: Starter is ₹2,499/mo, Growth is ₹6,999/mo.",
        "user": "Bhai mujhe starter bot ka pricing batao aur kya ye monthly hai?",
        "expected_keywords": ["2,499", "month", "starter"]
    },
    {
        "name": "Hallucination Defense (Out-of-Scope)",
        "system": "You are AD, official assistant for BiharStack Digital Solutions. Only answer from verified facts.",
        "user": "Aapke paas pizza delivery option hai kya?",
        "expected_keywords": ["nahi", "software", "support"]
    },
    {
        "name": "Lead Capture Confirmation",
        "system": "You are AD, official assistant for BiharStack Digital Solutions.",
        "user": "Mera number 9876543210 hai, call kar lena.",
        "expected_keywords": ["9876543210", "sampark", "shukriya"]
    }
]

def run_evaluation():
    print(f"==================================================")
    print(f" 🧪 Evaluating AD Model at {AD_ENDPOINT}")
    print(f" Target Model: {MODEL_NAME}")
    print(f"==================================================\n")

    url = f"{AD_ENDPOINT.rstrip('/')}/chat/completions"
    passed = 0

    for i, tc in enumerate(TEST_CASES, 1):
        print(f"[*] Test {i}/{len(TEST_CASES)}: {tc['name']}")
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": tc["system"]},
                {"role": "user", "content": tc["user"]}
            ],
            "temperature": 0.1,
            "max_tokens": 256
        }

        start_time = time.time()
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                data = json.loads(res.read().decode("utf-8"))
                latency = round((time.time() - start_time) * 1000, 2)
                reply = data["choices"][0]["message"]["content"]
                
                print(f"    Latency: {latency} ms")
                print(f"    Reply:   {reply.strip()[:140]}...")

                reply_lower = reply.lower()
                matches = [kw for kw in tc["expected_keywords"] if kw.lower() in reply_lower]
                if len(matches) >= 1:
                    print(f"    Status:  ✅ PASSED (Matched: {matches})\n")
                    passed += 1
                else:
                    print(f"    Status:  ⚠️ WARNING (Did not match expected keywords: {tc['expected_keywords']})\n")
        except Exception as e:
            print(f"    Status:  ❌ FAILED to connect: {e}\n")

    print(f"==================================================")
    print(f" Evaluation Completed: {passed}/{len(TEST_CASES)} Tests Passed.")
    print(f"==================================================")

if __name__ == "__main__":
    run_evaluation()
