import { ChatMessage } from './types';

export interface LLMRequestOptions {
  provider?: 'ad' | 'gemini' | 'openai' | 'openrouter' | 'local';
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
  | 'openrouter'
  | 'local';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';

/**
 * Intelligent deterministic fallback generator for offline testing and local environments
 * Grounded strictly in the supplied context text.
 */
function generateLocalGroundedResponse(
  userQuery: string,
  contextText: string,
  systemPrompt: string
): string {
  const queryLower = userQuery.toLowerCase().trim();
  const isHinglish =
    systemPrompt.includes('LANGUAGE: Respond naturally in conversational Hinglish') ||
    systemPrompt.includes('Hinglish') ||
    /[a-zA-Z]/.test(userQuery);
  const isHindi = systemPrompt.includes('LANGUAGE: Respond primarily in standard Hindi');

  // Extract Assistant Name & Business Name from systemPrompt dynamically
  const personaMatch = systemPrompt.match(/You are "([^"]+)", the official[^"]*representing "([^"]+)"/);
  const assistantName = personaMatch ? personaMatch[1] : 'AI Assistant';
  const businessName = personaMatch ? personaMatch[2] : 'Our Business';

  // 1. Identity & "Who are you?" / "How can you help?" questions
  const isIdentityQuery =
    /tum kaun ho|tum kon ho|aap kaun ho|aap kon ho|kon ho tum|kaun ho tum|who are you|who r u|what is your name|apka naam|aapka naam|kya naam hai|introduce yourself|tell me about yourself|what can you do|kya kar sakte ho|how can you help|how can help you|kya madad kar|kya help kar/i.test(
      queryLower
    );

  if (isIdentityQuery) {
    if (isHindi) {
      return `नमस्ते! 🙏 मैं ${assistantName} हूँ, ${businessName} का आधिकारिक एआई सहायक। मैं यहाँ आपकी सहायता करने, सेवाओं और कीमतों की जानकारी देने के लिए उपलब्ध हूँ। बताइए, आज मैं आपकी क्या मदद कर सकता हूँ?`;
    }
    if (isHinglish) {
      return `Namaste! 🙏 Main ${assistantName} hoon, ${businessName} ka official AI assistant. Main yahan aapki queries solve karne, services aur pricing ki sahi jaankari dene, aur bookings mein help karne ke liye available hoon. Bataiye, aaj main aapki kya madad kar sakta hoon?`;
    }
    return `Hello! 👋 I am ${assistantName}, the official AI assistant representing ${businessName}. I am here to help you with our services, pricing, and support. How can I assist you today?`;
  }

  // 2. Greetings & Pleasantries (Dynamic & natural responses)
  if (/^(hi|hello|hey|namaste|greetings|good\s*(morning|afternoon|evening)|kaise ho|kya haal|kaisa chal)\b/i.test(queryLower) && queryLower.length < 35) {
    if (queryLower.includes('morning')) {
      return isHinglish
        ? `Good morning! ☀️ Kaise hain aap? ${businessName} mein aapka swagat hai. Bataiye, aaj main aapki kya madad kar sakta hoon?`
        : `Good morning! ☀️ Welcome to ${businessName}. How can I assist you today?`;
    }
    if (queryLower.includes('evening')) {
      return isHinglish
        ? `Good evening! 🌆 Kaise hain aap? ${businessName} mein aapka swagat hai. Bataiye, aaj main aapki kya madad kar sakta hoon?`
        : `Good evening! 🌆 Welcome to ${businessName}. How can I assist you today?`;
    }
    if (queryLower.includes('kaise ho') || queryLower.includes('kya haal')) {
      return `Main badhiya hoon, poochhne ke liye bahut shukriya! 🙏 Aap bataiye, sab kaisa chal raha hai? ${businessName} se related main aapki kya help kar sakta hoon?`;
    }
    const greetingsHinglish = [
      `Namaste! 🙏 ${businessName} mein aapka swagat hai. Bataiye, main aapki kya sahayata kar sakta hoon?`,
      `Hello! 👋 Kaise hain aap? Bataiye, ${businessName} se related aaj aap kya jaanna chahte hain?`,
      `Hi there! 😊 Main ${businessName} assistant hoon. Bataiye, main aapki kya madad kar sakta hoon?`
    ];
    return isHinglish
      ? greetingsHinglish[userQuery.length % greetingsHinglish.length]
      : `Hello! Welcome to ${businessName}. How can I assist you today?`;
  }

  // 3. Contact Number / Helpline / Phone / Support Inquiries
  if (/(contact|phone|mobile|number|call|email|reach|support|sampark|helpline|whatsapp|address|office|location|kahan|timing)\b/i.test(queryLower)) {
    const phones = contextText.match(/(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b|1800[\s-]?\d{3}[\s-]?\d{3,4}\b/g);
    const emails = (contextText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || [])
      .map((e) => e.toLowerCase().trim())
      .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('schema.org'));
    const addressRegex = /(?:office|address|location|headquarters)[\s:-]+([^\n]{10,120})/i;
    const addrMatch = contextText.match(addressRegex);
    const displayAddress = addrMatch
      ? addrMatch[1].trim()
      : contextText.match(/(?:[A-Za-z0-9\s,.-]+(?:Road|Street|Nagar|PIN|Sector|Patna|Bihar|Delhi|Mumbai|Bengaluru)[^\n]{5,100})/i)?.[0]?.trim() || null;

    if ((phones && phones.length > 0) || emails.length > 0 || displayAddress) {
      let reply = isHinglish
        ? `Aap hamari ${businessName} team se directly contact kar sakte hain:\n\n`
        : `You can reach out to our team directly through the following channels:\n\n`;

      if (phones && phones.length > 0) {
        const uniquePhones = Array.from(new Set(phones)).slice(0, 3).join(' / ');
        reply += `📞 **Phone / Helpline:** ${uniquePhones}\n`;
      }
      if (emails.length > 0) {
        const uniqueEmails = Array.from(new Set(emails)).slice(0, 2).join(', ');
        reply += `✉️ **Support Email:** ${uniqueEmails}\n`;
      }
      if (displayAddress) {
        reply += `📍 **Office Address:** ${displayAddress}\n`;
      }
      reply += isHinglish
        ? `\nAap chahein toh apna contact number ya email yahan share kar sakte hain, hamari team aapse turant connect kar legi!`
        : `\nFeel free to drop your phone number or email here, and our team will get in touch with you right away!`;
      return reply.trim();
    } else {
      return isHinglish
        ? `Abhi hamara direct phone number yahan updated nahi hai. Lekin aap apna phone number ya email yahan drop kar sakte hain, hamari ${businessName} team aapse turant connect karke assist karegi!`
        : `We don't have our direct phone number updated in this chat yet. Feel free to leave your contact details here, and our team at ${businessName} will reach out to assist you!`;
    }
  }

  // 4. Policy / Refund / Cancellation / Money-Back Inquiries
  if (/(refund|policy|cancel|return|money[\s-]back|guarantee|warranty|privacy)\b/i.test(queryLower)) {
    const policyLines = contextText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /(?:refund|money[\s-]back|guarantee|privacy|policy|return|sla|uptime)/i.test(l) && l.length > 15 && l.length < 250);

    if (policyLines.length > 0) {
      return isHinglish
        ? `Hamari policy ke details ye hain:\n\n${policyLines.slice(0, 3).map((l) => `• ${l.replace(/^[-*•#\s]+/, '')}`).join('\n')}\n\nKya aapko iske baare mein aur koi specific jaankari chahiye?`
        : `Here are the key details regarding our policies:\n\n${policyLines.slice(0, 3).map((l) => `• ${l.replace(/^[-*•#\s]+/, '')}`).join('\n')}\n\nWould you like more details on any specific policy?`;
    }
  }

  // 5. Pricing / Plans / Cost Inquiries
  if (/(price|pricing|cost|plan|fees|charge|subscription|rate|kitna)\b/i.test(queryLower)) {
    const priceLines = contextText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /(?:₹|Rs\.?|INR|\$)\s*\d+/i.test(l));

    if (priceLines.length > 0) {
      return isHinglish
        ? `Hamare available plans aur pricing ye hain:\n\n${priceLines.slice(0, 4).map((l) => `• ${l.replace(/^[-*•#\s]+/, '')}`).join('\n')}\n\nSabhi plans ke saath free trial available hai! Kya aap kisi specific plan ke baare mein jaanna chahte hain?`
        : `Here are our available pricing plans:\n\n${priceLines.slice(0, 4).map((l) => `• ${l.replace(/^[-*•#\s]+/, '')}`).join('\n')}\n\nAll plans include a free trial! Would you like more details on any particular plan?`;
    }
  }

  // 6. If no context provided at all
  if (!contextText || contextText.includes('(No business knowledge context available')) {
    if (isHinglish) {
      return `Main ${businessName} ka official AI Assistant hoon! Is specific query ka verified record abhi mere paas nahi hai, par aap mujhse hamari services, pricing, contact details ya order tracking ke baare mein pooch sakte hain. Aap chahein toh apna question thoda detail mein likh sakte hain ya phone number share kar sakte hain!`;
    }
    if (isHindi) {
      return `मैं ${businessName} का आधिकारिक एआई सहायक हूँ। इस विषय पर विवरण अभी उपलब्ध नहीं है, लेकिन आप सेवाओं, कीमतों या संपर्क के बारे में पूछ सकते हैं।`;
    }
    return `I am the official AI Assistant for ${businessName}. I don't have records for that specific topic yet, but feel free to ask about our services, pricing, contact details, or bookings!`;
  }

  // Extract clean lines from context
  const lines = contextText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('SOURCE') && !l.startsWith('Title:') && !l.startsWith('URL:') && !l.startsWith('---') && !l.startsWith('Content:'));

  const stopWords = new Set([
    'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
    'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'to',
    'in', 'at', 'of', 'for', 'on', 'with', 'by', 'a', 'an', 'the', 'you',
    'your', 'my', 'our', 'it', 'its', 'they', 'them', 'can', 'could', 'would', 'should'
  ]);

  const queryWords = queryLower
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const matchingLines: { line: string; score: number }[] = [];
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      const root = word.endsWith('s') ? word.slice(0, -1) : word.endsWith('ing') ? word.slice(0, -3) : word;
      if (lineLower.includes(word) || (root.length >= 3 && lineLower.includes(root))) {
        score += 2;
      }
    }
    if (score > 0) {
      matchingLines.push({ line, score });
    }
  }

  if (matchingLines.length === 0) {
    if (isHinglish) {
      return `Is baare mein verified detail abhi mere paas available nahi hai. Agar aap chahein toh apna question thoda detail mein bata sakte hain, ya apna number drop kar sakte hain taaki hamari team connect kar sake!`;
    }
    return `I don't have verified information regarding that specific inquiry in our records. Feel free to provide more details or leave your contact information so our team can assist you!`;
  }

  matchingLines.sort((a, b) => b.score - a.score);
  const topExcerpts = matchingLines.slice(0, 3).map((m) => `• ${m.line.replace(/^[-*•#\s]+/, '')}`);
  const combined = topExcerpts.join('\n');
  return isHinglish
    ? `Hamare records ke mutabiq:\n\n${combined}\n\nKya main iske baare mein aapko kuch aur bata sakta hoon?`
    : `According to our business records:\n\n${combined}\n\nIs there anything else you would like to know about this?`;
}

/**
 * Call Gemini generateContent REST API
 */
async function callGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.2
): Promise<LLMResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Map messages to Gemini format: user -> user, assistant -> model
  const contents = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm sorry, I don't have that information in the available business knowledge.";

  const inputTokens = json?.usageMetadata?.promptTokenCount;
  const outputTokens = json?.usageMetadata?.candidatesTokenCount;

  return {
    text: text.trim(),
    inputTokens,
    outputTokens,
    model,
  };
}

/**
 * Call OpenAI chat completions REST API
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
  const text =
    json?.choices?.[0]?.message?.content ||
    "I'm sorry, I don't have that information in the available business knowledge.";

  return {
    text: text.trim(),
    inputTokens: json?.usage?.prompt_tokens,
    outputTokens: json?.usage?.completion_tokens,
    model,
  };
}

/**
 * Call OpenRouter chat completions REST API (Multi-model aggregator)
 */
async function callOpenRouter(
  systemPrompt: string,
  messages: ChatMessage[],
  apiKey: string,
  model: string = process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free',
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
      'X-Title': 'BiharStack AI Chatbot',
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
  const text =
    json?.choices?.[0]?.message?.content ||
    "I'm sorry, I don't have that information in the available business knowledge.";

  return {
    text: text.trim(),
    inputTokens: json?.usage?.prompt_tokens,
    outputTokens: json?.usage?.completion_tokens,
    model: json?.model || model,
  };
}

/**
 * Call custom proprietary "AD" model endpoint (vLLM / Ollama / RunPod GPU server)
 */
async function callADModel(
  systemPrompt: string,
  messages: ChatMessage[],
  endpointUrl: string = process.env.AD_MODEL_ENDPOINT || 'http://localhost:8000/v1',
  model: string = process.env.AD_MODEL_NAME || 'ad-model',
  temperature: number = 0.2
): Promise<LLMResponse> {
  const cleanEndpoint = endpointUrl.replace(/\/+$/, '');
  const url = cleanEndpoint.endsWith('/chat/completions')
    ? cleanEndpoint
    : `${cleanEndpoint}/chat/completions`;

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
  const text =
    json?.choices?.[0]?.message?.content ||
    "I'm sorry, I don't have that information in the available business knowledge.";

  return {
    text: text.trim(),
    inputTokens: json?.usage?.prompt_tokens,
    outputTokens: json?.usage?.completion_tokens,
    model: `AD:${json?.model || model}`,
  };
}

/**
 * Main LLM generation interface supporting multi-provider dispatch with graceful fallback
 */
export async function generateLLMResponse(params: {
  systemPrompt: string;
  messages: ChatMessage[];
  contextText: string;
  options?: LLMRequestOptions;
}): Promise<LLMResponse> {
  const { systemPrompt, messages, contextText, options } = params;
  const provider = options?.provider || DEFAULT_PROVIDER;
  const model = options?.model || DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.2;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const adEndpoint = process.env.AD_MODEL_ENDPOINT;

  // 0. Primary Proprietary: Try AD Model if requested or if AD_MODEL_ENDPOINT is configured
  if (provider === 'ad' || adEndpoint) {
    if (adEndpoint) {
      try {
        console.log(`[LLMService] 🚀 Routing to proprietary AD Model at ${adEndpoint}`);
        return await callADModel(systemPrompt, messages, adEndpoint, options?.model, temperature);
      } catch (err: any) {
        console.warn(`[LLMService] Remote AD endpoint call failed: ${err.message}. Running in-process AD Engine.`);
      }
    }
    // In-process AD Model Engine execution
    const { runADModelInference } = await import('./ad-engine');
    return runADModelInference({ systemPrompt, messages, contextText, temperature });
  }

  // 1. Try OpenRouter if explicitly set as provider
  if (
    provider === 'openrouter' &&
    openrouterKey &&
    !openrouterKey.includes('placeholder')
  ) {
    try {
      const openRouterModel = options?.model || process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free';
      return await callOpenRouter(systemPrompt, messages, openrouterKey, openRouterModel, temperature);
    } catch (err: any) {
      console.warn(`[LLMService] OpenRouter call failed: ${err.message}. Trying next provider.`);
    }
  }

  // 2. Try Gemini
  if (
    provider === 'gemini' &&
    geminiKey &&
    !geminiKey.includes('placeholder') &&
    !geminiKey.includes('your-')
  ) {
    try {
      return await callGemini(systemPrompt, messages, geminiKey, model, temperature);
    } catch (err: any) {
      console.warn(`[LLMService] Gemini call failed: ${err.message}. Trying fallback.`);
    }
  }

  // 3. Try OpenAI
  if (
    provider === 'openai' &&
    openaiKey &&
    !openaiKey.includes('placeholder') &&
    !openaiKey.includes('your-')
  ) {
    try {
      return await callOpenAI(systemPrompt, messages, openaiKey, model, temperature);
    } catch (err: any) {
      console.warn(`[LLMService] OpenAI call failed: ${err.message}. Trying fallback.`);
    }
  }

  // 4. Automatic High-Availability Fallback: Try OpenRouter if not already attempted
  if (
    provider !== 'openrouter' &&
    openrouterKey &&
    !openrouterKey.includes('placeholder')
  ) {
    try {
      const fallbackModel = process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-27b:free';
      console.log(`[LLMService] Using OpenRouter high-availability fallback with model ${fallbackModel}`);
      return await callOpenRouter(systemPrompt, messages, openrouterKey, fallbackModel, temperature);
    } catch (err: any) {
      console.warn(`[LLMService] OpenRouter fallback failed: ${err.message}. Using grounded fallback.`);
    }
  }

  // 5. Deterministic local grounded fallback
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const text = generateLocalGroundedResponse(lastUserMessage, contextText, systemPrompt);

  return {
    text,
    inputTokens: Math.ceil(systemPrompt.length / 4),
    outputTokens: Math.ceil(text.length / 4),
    model: 'local-grounded-rag',
  };
}
