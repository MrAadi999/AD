import * as crypto from 'crypto';

export interface EmbeddingOptions {
  provider?: 'gemini' | 'openai' | 'local';
  model?: string;
  dimensions?: number;
}

const DEFAULT_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '3072', 10);
const DEFAULT_PROVIDER = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase() as
  | 'gemini'
  | 'openai'
  | 'local';
const DEFAULT_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';

/**
 * Deterministic local embedding generator (768-dim normalized vector)
 * Uses bag-of-words / token feature hashing + character 3-grams with cosine normalization.
 * Useful for test suites, offline development, and zero-cost local environments.
 */
export function generateLocalEmbedding(text: string, dimensions: number = DEFAULT_DIMENSIONS): number[] {
  const vector = new Float64Array(dimensions);
  const normalized = text.toLowerCase().trim();

  if (!normalized) {
    // Return unit vector along first dimension if empty
    vector[0] = 1.0;
    return Array.from(vector);
  }

  // 1. Word token hashing
  const words = normalized.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash = crypto.createHash('sha256').update(word).digest();
    // Use multi-hash projection for each word
    for (let k = 0; k < 4; k++) {
      const idx = Math.abs(hash.readInt32BE(k * 4)) % dimensions;
      const sign = (hash[k * 4] % 2 === 0) ? 1.0 : -1.0;
      const weight = 1.0 / Math.sqrt(i + 1); // slight positional decay
      vector[idx] += sign * weight;
    }
  }

  // 2. Character 3-gram hashing for subword/typo robustness
  for (let i = 0; i < normalized.length - 2; i++) {
    const tri = normalized.substring(i, i + 3);
    const hash = crypto.createHash('md5').update(tri).digest();
    const idx = Math.abs(hash.readInt32BE(0)) % dimensions;
    const sign = (hash[0] % 2 === 0) ? 0.5 : -0.5;
    vector[idx] += sign;
  }

  // 3. Normalize vector to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  const result: number[] = new Array(dimensions);
  if (norm === 0) {
    result[0] = 1.0;
    for (let i = 1; i < dimensions; i++) result[i] = 0.0;
  } else {
    for (let i = 0; i < dimensions; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return result;
}

/**
 * Generate embedding using Gemini REST API
 */
async function generateGeminiEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = 'text-embedding-004'
): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;

  const requests = texts.map((text) => ({
    model: `models/${model}`,
    content: {
      parts: [{ text }],
    },
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embedding API failed (${res.status}): ${errText}`);
  }

  const json = await res.json();
  if (!json.embeddings || !Array.isArray(json.embeddings)) {
    throw new Error('Invalid Gemini embeddings response format');
  }

  return json.embeddings.map((e: any) => e.values as number[]);
}

/**
 * Generate embedding using OpenAI REST API
 */
async function generateOpenAIEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = 'text-embedding-3-small',
  dimensions: number = 768
): Promise<number[][]> {
  const url = 'https://api.openai.com/v1/embeddings';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embedding API failed (${res.status}): ${errText}`);
  }

  const json = await res.json();
  if (!json.data || !Array.isArray(json.data)) {
    throw new Error('Invalid OpenAI embeddings response format');
  }

  // Sort by index in case returned out of order
  const sorted = [...json.data].sort((a: any, b: any) => a.index - b.index);
  return sorted.map((d: any) => d.embedding as number[]);
}

/**
 * Generate embedding for a single text chunk
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[]> {
  const results = await generateEmbeddingsBatch([text], options);
  return results[0];
}

/**
 * Generate embeddings for multiple text chunks in batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options?: EmbeddingOptions
): Promise<number[][]> {
  if (!texts.length) return [];

  const provider = options?.provider || DEFAULT_PROVIDER;
  const dimensions = options?.dimensions || DEFAULT_DIMENSIONS;
  const model = options?.model || DEFAULT_MODEL;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini if configured
  if (provider === 'gemini' && geminiKey && !geminiKey.includes('placeholder') && !geminiKey.includes('your-')) {
    try {
      return await generateGeminiEmbeddings(texts, geminiKey, model);
    } catch (err: any) {
      console.warn(`[EmbeddingService] Gemini provider error: ${err.message}. Falling back to deterministic local embeddings.`);
    }
  }

  // 2. Try OpenAI if configured
  if (provider === 'openai' && openaiKey && !openaiKey.includes('placeholder') && !openaiKey.includes('your-')) {
    try {
      return await generateOpenAIEmbeddings(texts, openaiKey, model, dimensions);
    } catch (err: any) {
      console.warn(`[EmbeddingService] OpenAI provider error: ${err.message}. Falling back to deterministic local embeddings.`);
    }
  }

  // 3. Fallback to deterministic local normalized vector generator
  return texts.map((t) => generateLocalEmbedding(t, dimensions));
}
