import { generateEmbedding } from '../embeddings/embedding-service';
import { KnowledgeChunkRecord } from '../knowledge/vector-store';
import * as crypto from 'crypto';

export interface AnalyzedSystemResult {
  url: string;
  brandName: string;
  assistantName: string;
  description: string;
  brandColor: string;
  avatarUrl?: string;
  tone: 'Friendly' | 'Professional' | 'Casual' | 'Helpful';
  welcomeMessage: string;
  suggestedQuestions: string[];
  systemPrompt: string;
  extractedPages: Array<{ url: string; title: string }>;
  seedChunks: KnowledgeChunkRecord[];
}

/**
 * Reverse-engineers website metadata, schemas, and brand styling from HTML
 */
export function reverseEngineerSiteMetadata(html: string, targetUrl: string) {
  const urlObj = new URL(targetUrl);
  const hostname = urlObj.hostname.replace(/^www\./, '');

  // 1. Extract Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : hostname;

  // Derive Brand Name from title (e.g. "Acme Inc - Modern Cloud" -> "Acme Inc")
  let brandName = pageTitle.split(/[-|–•]/)[0].trim();
  if (!brandName || brandName.length > 35) {
    brandName = hostname.split('.')[0];
    brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
  }

  // 2. Extract Meta Description
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch
    ? descMatch[1].trim()
    : `AI Assistant for ${brandName} providing instant support, pricing info, and product guidance.`;

  // 3. Extract Theme / Brand Color
  const themeColorMatch =
    html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*name=["']msapplication-TileColor["'][^>]*content=["']([^"']+)["']/i);
  const brandColor = themeColorMatch ? themeColorMatch[1].trim() : '#2563EB';

  // 4. Extract Favicon or Logo
  let avatarUrl = '';
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  const iconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);

  if (ogImageMatch) {
    avatarUrl = ogImageMatch[1].startsWith('http')
      ? ogImageMatch[1]
      : `${urlObj.origin}${ogImageMatch[1].startsWith('/') ? '' : '/'}${ogImageMatch[1]}`;
  } else if (iconMatch) {
    avatarUrl = iconMatch[1].startsWith('http')
      ? iconMatch[1]
      : `${urlObj.origin}${iconMatch[1].startsWith('/') ? '' : '/'}${iconMatch[1]}`;
  }

  // 5. Extract JSON-LD Schemas if present (reverse-engineer business data)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const structuredData: any[] = [];
  if (jsonLdMatches) {
    for (const tag of jsonLdMatches) {
      try {
        const jsonContent = tag.replace(/<\/?script[^>]*>/gi, '').trim();
        structuredData.push(JSON.parse(jsonContent));
      } catch {
        // Skip unparseable JSON-LD
      }
    }
  }

  // 6. Extract key navigation paths (about, pricing, docs, contact)
  const linkMatches = Array.from(html.matchAll(/href=["'](\/[a-zA-Z0-9_-]+|https?:\/\/[^"']+)["']/gi));
  const discoveredPaths = new Set<string>();
  for (const m of linkMatches) {
    const raw = m[1];
    if (/(about|price|pricing|contact|faq|docs|features|services|support)/i.test(raw)) {
      discoveredPaths.add(raw.startsWith('http') ? raw : `${urlObj.origin}${raw}`);
    }
  }

  // 7. Strip HTML tags for clean raw content extraction
  const cleanBodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    brandName,
    pageTitle,
    description,
    brandColor,
    avatarUrl,
    structuredData,
    discoveredLinks: Array.from(discoveredPaths).slice(0, 10),
    sampleContent: cleanBodyText.substring(0, 6000),
  };
}

/**
 * 5-Minute Zero-Setup Bot Synthesis Engine
 * Takes target URL, reverse-engineers its content, and synthesizes a fully primed chatbot.
 */
export async function autoGenerateBotFromUrl(params: {
  workspaceId: string;
  chatbotId: string;
  targetUrl: string;
  apiKey?: string;
}): Promise<AnalyzedSystemResult> {
  const { workspaceId, chatbotId, targetUrl, apiKey = process.env.GEMINI_API_KEY } = params;

  let html = '';
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BiharStack-BotBuilder/1.0; +https://biharstack.ai)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (res.ok) {
      html = await res.text();
    }
  } catch (err: any) {
    console.warn(`[AutoBotGenerator] Direct fetch failed for ${targetUrl}:`, err.message);
  }

  // Fallback template HTML if URL fetch was blocked or offline
  if (!html) {
    const hostname = new URL(targetUrl).hostname;
    html = `<html><head><title>${hostname} AI Assistant</title><meta name="description" content="Official website and services for ${hostname}"/></head><body><h1>Welcome to ${hostname}</h1><p>We provide modern solutions, customer support, and seamless digital experiences.</p></body></html>`;
  }

  const meta = reverseEngineerSiteMetadata(html, targetUrl);

  let assistantName = `${meta.brandName} Assistant`;
  let welcomeMessage = `Hello! 👋 Welcome to ${meta.brandName}. How can I assist you today?`;
  let tone: 'Friendly' | 'Professional' | 'Casual' | 'Helpful' = 'Friendly';
  let suggestedQuestions = [
    `What services does ${meta.brandName} offer?`,
    'How do I get started?',
    'What are your pricing plans?',
    'How can I contact support?',
  ];
  let customSystemPrompt = '';

  // Use Gemini 1.5 Flash to synthesize high-IQ persona, system prompt, and suggested questions
  if (apiKey) {
    try {
      const synthesisPrompt = `You are BiharStack's Automated Enterprise AI Bot Architect.
Analyze the following extracted website reverse-engineering data:
Brand Name: "${meta.brandName}"
Description: "${meta.description}"
Sample Content: "${meta.sampleContent.substring(0, 3000)}"

Generate a tailored JSON response for this business chatbot:
{
  "assistantName": "Name of AI Assistant (e.g. Acme Guide, Nexus AI)",
  "welcomeMessage": "Warm, engaging welcome message under 20 words",
  "tone": "Friendly" | "Professional" | "Helpful",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3", "Question 4"],
  "personaPrompt": "A comprehensive system prompt establishing role, scope, grounding guidelines, and tone"
}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: synthesisPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (geminiRes.ok) {
        const json = await geminiRes.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(text);

        if (parsed.assistantName) assistantName = parsed.assistantName;
        if (parsed.welcomeMessage) welcomeMessage = parsed.welcomeMessage;
        if (parsed.tone) tone = parsed.tone;
        if (Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0) {
          suggestedQuestions = parsed.suggestedQuestions.slice(0, 4);
        }
        if (parsed.personaPrompt) customSystemPrompt = parsed.personaPrompt;
      }
    } catch (err: any) {
      console.warn('[AutoBotGenerator] Gemini synthesis fallback:', err.message);
    }
  }

  // Create initial Seed Knowledge Chunks with Vector Embeddings
  const seedChunks: KnowledgeChunkRecord[] = [];
  const initialSections = [
    {
      title: `${meta.brandName} Overview`,
      content: `${meta.brandName} is dedicated to providing high quality solutions. ${meta.description}`,
    },
    {
      title: `${meta.brandName} Primary Content`,
      content: meta.sampleContent.substring(0, 1500) || `${meta.brandName} website content and official services.`,
    },
  ];

  for (let i = 0; i < initialSections.length; i++) {
    const section = initialSections[i];
    const chunkId = crypto.randomUUID();
    const contentHash = crypto.createHash('sha256').update(section.content).digest('hex');

    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(section.content);
    } catch {
      // safe fallback
    }

    seedChunks.push({
      id: chunkId,
      workspace_id: workspaceId,
      chatbot_id: chatbotId,
      content: section.content,
      chunk_index: i,
      token_count: Math.ceil(section.content.length / 4),
      content_hash: contentHash,
      embedding,
      metadata: {
        url: targetUrl,
        title: section.title,
        source_type: 'auto_reverse_engineered',
      },
      created_at: new Date().toISOString(),
    });
  }

  return {
    url: targetUrl,
    brandName: meta.brandName,
    assistantName,
    description: meta.description,
    brandColor: meta.brandColor,
    avatarUrl: meta.avatarUrl,
    tone,
    welcomeMessage,
    suggestedQuestions,
    systemPrompt: customSystemPrompt,
    extractedPages: meta.discoveredLinks.map((link) => ({
      url: link,
      title: `${meta.brandName} Page`,
    })),
    seedChunks,
  };
}
