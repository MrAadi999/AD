export interface EmbeddingOptions {
  provider?: 'gemini' | 'openai';
  model?: string;
  dimensions?: number;
}

export const EMBEDDING_MODEL_NAME = 'text-embedding-004';
export const EMBEDDING_DIMENSIONS_VALUE = 768;

const DEFAULT_DIMENSIONS = parseInt(
  process.env.EMBEDDING_DIMENSIONS || String(EMBEDDING_DIMENSIONS_VALUE),
  10
);
const DEFAULT_PROVIDER = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase() as
  | 'gemini'
  | 'openai';
const DEFAULT_MODEL = process.env.EMBEDDING_MODEL || EMBEDDING_MODEL_NAME;

/**
 * Generate embedding using Gemini REST API (model: text-embedding-004, 768 dimensions)
 */
async function generateGeminiEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${apiKey}`;

  const requests = texts.map((text) => ({
    model: `models/${model}`,
    content: {
      parts: [{ text }],
    },
    outputDimensionality: DEFAULT_DIMENSIONS,
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embedding API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  if (!json.embeddings || !Array.isArray(json.embeddings)) {
    throw new Error('Invalid Gemini embeddings response format');
  }

  return json.embeddings.map((e: any) => e.values as number[]);
}

/**
 * Generate embedding using OpenAI REST API (e.g. text-embedding-3-small with 768 dimensions)
 */
async function generateOpenAIEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = 'text-embedding-3-small',
  dimensions: number = DEFAULT_DIMENSIONS
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
    throw new Error(`OpenAI embedding API error (${res.status}): ${errText}`);
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
 * Generate embedding for a single text chunk.
 * Fails with a clear Error if no embedding provider succeeds. No fake in-memory fallback.
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[]> {
  const results = await generateEmbeddingsBatch([text], options);
  if (!results.length || !results[0]) {
    throw new Error('Embedding generation produced empty vector');
  }
  return results[0];
}

/**
 * Generate embeddings for multiple text chunks in batch.
 * Strictly requires valid provider API credentials. Throws if all providers fail.
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

  // 1. Try Gemini
  if (provider === 'gemini') {
    if (!geminiKey || geminiKey.includes('placeholder') || geminiKey.includes('your-')) {
      throw new Error('GEMINI_API_KEY is not configured. Embeddings require a valid Gemini API key.');
    }
    return await generateGeminiEmbeddings(texts, geminiKey, model);
  }

  // 2. Try OpenAI
  if (provider === 'openai') {
    if (!openaiKey || openaiKey.includes('placeholder') || openaiKey.includes('your-')) {
      throw new Error('OPENAI_API_KEY is not configured. Embeddings require a valid OpenAI API key.');
    }
    return await generateOpenAIEmbeddings(texts, openaiKey, model, dimensions);
  }

  throw new Error(`Unsupported or unconfigured embedding provider: "${provider}"`);
}
