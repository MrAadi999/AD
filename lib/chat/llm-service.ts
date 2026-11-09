import { ChatMessage } from './types';

export interface LLMRequestOptions {
  provider?: 'ad' | 'gemini' | 'openai' | 'openrouter';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  model: string;
}

const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase() as
  | 'ad'
  | 'gemini'
  | 'openai'
  | 'openrouter';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-1.5-flash';

/**
 * Call Google Gemini REST API
 */
async function callGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string = 'gemini-1.5-flash',
  temperature: number = 0.2
): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    {
      role: 'model',
      parts: [
        {
          text: 'Understood. I will strictly adhere to the business knowledge, ground all answers without hallucination, and follow all persona constraints.',
        },
      ],
    },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned empty text or was blocked by safety settings');
  }

  return {
    text: text.trim(),
    inputTokens: json.usageMetadata?.promptTokenCount,
    outputTokens: json.usageMetadata?.candidatesTokenCount,
    model: `gemini:${model}`,
  };
}

/**
 * Call OpenAI REST API
 */
async function callOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.2
): Promise<LLMResponse> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenAI returned empty response');
  }

  return {
    text: text.trim(),
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
    model: `openai:${model}`,
  };
}

/**
 * Call OpenRouter REST API
 */
async function callOpenRouter(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string = 'qwen/qwen-2.5-7b-instruct',
  temperature: number = 0.2
): Promise<LLMResponse> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Chatbot Platform',
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenRouter returned empty response');
  }

  return {
    text: text.trim(),
    inputTokens: json.usage?.prompt_tokens,
    outputTokens: json.usage?.completion_tokens,
    model: `openrouter:${model}`,
  };
}

/**
 * Call custom AD Model endpoint
 */
async function callADModel(
  systemPrompt: string,
  messages: ChatMessage[],
  endpointUrl: string = process.env.AD_MODEL_ENDPOINT || 'http://localhost:8000/v1',
  model: string = process.env.AD_MODEL_NAME || 'ad-model',
  temperature: number = 0.2
): Promise<LLMResponse> {
  const url = endpointUrl.endsWith('/')
    ? `${endpointUrl}chat/completions`
    : `${endpointUrl}/chat/completions`;

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.AD_MODEL_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.AD_MODEL_API_KEY}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AD Model error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('AD Model returned empty response');
  }

  return {
    text: text.trim(),
    inputTokens: json?.usage?.prompt_tokens,
    outputTokens: json?.usage?.completion_tokens,
    model: `AD:${json?.model || model}`,
  };
}

/**
 * Main LLM generation interface supporting multi-provider dispatch with graceful fallback.
 * If all providers fail: logs an alert and returns a clear "temporarily unavailable" message.
 * No regex templates or fake fallback answers.
 */
export async function generateLLMResponse(params: {
  systemPrompt: string;
  messages: ChatMessage[];
  contextText: string;
  options?: LLMRequestOptions;
}): Promise<LLMResponse> {
  const { systemPrompt, messages, options } = params;
  const provider = options?.provider || DEFAULT_PROVIDER;
  const model = options?.model || DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.2;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const adEndpoint = process.env.AD_MODEL_ENDPOINT;

  const errors: string[] = [];

  // 1. Try AD Model if configured
  if (provider === 'ad' || adEndpoint) {
    if (adEndpoint) {
      try {
        return await callADModel(systemPrompt, messages, adEndpoint, options?.model, temperature);
      } catch (err: any) {
        errors.push(`AD Model: ${err.message}`);
        console.warn(`[LLMService] AD endpoint call failed: ${err.message}. Trying next provider.`);
      }
    }
  }

  // 2. Try Gemini
  if (geminiKey && !geminiKey.includes('placeholder') && !geminiKey.includes('your-')) {
    try {
      return await callGemini(systemPrompt, messages, geminiKey, model, temperature);
    } catch (err: any) {
      errors.push(`Gemini: ${err.message}`);
      console.warn(`[LLMService] Gemini call failed: ${err.message}. Trying fallback.`);
    }
  }

  // 3. Try OpenAI
  if (openaiKey && !openaiKey.includes('placeholder') && !openaiKey.includes('your-')) {
    try {
      return await callOpenAI(systemPrompt, messages, openaiKey, model, temperature);
    } catch (err: any) {
      errors.push(`OpenAI: ${err.message}`);
      console.warn(`[LLMService] OpenAI call failed: ${err.message}. Trying fallback.`);
    }
  }

  // 4. Try OpenRouter
  if (openrouterKey && !openrouterKey.includes('placeholder')) {
    try {
      const fallbackModel = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct';
      return await callOpenRouter(systemPrompt, messages, openrouterKey, fallbackModel, temperature);
    } catch (err: any) {
      errors.push(`OpenRouter: ${err.message}`);
      console.warn(`[LLMService] OpenRouter fallback failed: ${err.message}.`);
    }
  }

  // ALL LLM PROVIDERS FAILED
  console.error('[CRITICAL ALERT] All LLM providers failed. Service temporarily unavailable.', {
    errors,
    timestamp: new Date().toISOString(),
  });

  return {
    text: 'This assistant is temporarily unavailable. Our technical team has been alerted. Please try again in a few moments, or leave your contact details so our team can reach out to you directly.',
    inputTokens: 0,
    outputTokens: 0,
    model: 'unavailable',
  };
}
