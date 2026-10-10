/**
 * Universal Native High-Performance Website Crawler & Knowledge Extractor
 * Works universally on ANY website in the world (WordPress, Shopify, Next.js, React,
 * Wix, Squarespace, Webflow, custom HTML, enterprise portals, etc.).
 *
 * Features:
 * - Desktop browser header emulation with graceful redirect handling
 * - Canonical URL normalization (strips www., tracking params, trailing slashes to prevent duplicates)
 * - Deep entity mining (Global & Indian Phones, WhatsApp, Emails, Addresses, Global Pricing, FAQs, JSON-LD Schema)
 * - Sitemap.xml discovery (/sitemap.xml, /sitemap_index.xml, /wp-sitemap.xml, /sitemap-pages.xml)
 * - BFS internal link crawler with smart page prioritization
 * - High-fidelity HTML to Markdown/Clean Text parser
 * - Automatic Master Business Profile synthesis & Vector Embedding pipeline
 * - 100% universal: Zero hardcoded domains, works for any URL globally
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import { CrawlJob, KnowledgeSource } from './types';
import {
  inMemoryCrawlJobs,
  inMemoryKnowledgeSources,
  getJobStateFile,
  saveSourcesToDisk,
} from './runner';
import { synthesizeMasterBusinessProfile } from '../knowledge/business-synthesizer';
import { processAllKnowledgeSourcesForChatbot } from '../knowledge/processor';
import { isSupabaseConfigured } from '../supabase/client';
import { createClient as createServerClient } from '../supabase/server';

export interface ExtractedPageData {
  url: string;
  title: string;
  meta_description: string;
  content: string;
  content_hash: string;
  word_count: number;
  status: 'completed' | 'failed';
  error_message?: string;
  entities: {
    phones: string[];
    emails: string[];
    whatsapp: string[];
    addresses: string[];
    pricing: string[];
    faqs: Array<{ question: string; answer: string }>;
  };
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Canonical URL Normalization
 * Ensures www and non-www, trailing slashes, and tracking query params
 * map to the EXACT same canonical URL.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    let u = rawUrl.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    const parsed = new URL(u);
    // Strip www. so www.domain.com and domain.com are identical canonical origins
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.hash = '';

    // Strip common tracking, analytics, and session query parameters
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'gclsrc',
      'dclid',
      'msclkid',
      'ref',
      'source',
      'v',
      'ts',
      'preview',
      'version',
      '_ga',
      '_gl',
    ];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));

    let str = parsed.toString();
    // Normalize trailing slash: /path/ -> /path (leave root '/' as '/')
    if (str.endsWith('/') && parsed.pathname !== '/') {
      str = str.slice(0, -1);
    }
    return str;
  } catch {
    return rawUrl;
  }
}

/**
 * Same Registered Domain Check
 * Matches domain.com with subdomains or www.
 */
export function isSameDomain(rootUrl: string, candidateUrl: string): boolean {
  try {
    const rootHost = new URL(rootUrl).hostname.toLowerCase().replace(/^www\./, '');
    const candHost = new URL(candidateUrl).hostname.toLowerCase().replace(/^www\./, '');
    return rootHost === candHost || candHost.endsWith('.' + rootHost);
  } catch {
    return false;
  }
}

/**
 * Universal High-Fidelity HTML to Clean Text & Structured Markdown Parser
 */
export function htmlToCleanText(html: string): string {
  if (!html) return '';

  let s = html;

  // 1. Remove non-content and noise tags completely
  s = s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi, ' ')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
    .replace(/<template\b[^<]*(?:(?!<\/template>)<[^<]*)*<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // 2. Format Accordion / Details / Summary (common FAQ format on modern sites)
  s = s.replace(/<summary[^>]*>([\s\S]*?)<\/summary>/gi, '\n\n### $1\n\n');

  // 3. Format Headings to Markdown
  s = s.replace(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/gi, '\n\n## $1\n\n');
  s = s.replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, '\n\n### $1\n\n');

  // 4. Format Lists
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1');

  // 5. Format Table rows & cells
  s = s.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, ' | $1');
  s = s.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, ' | $1');
  s = s.replace(/<\/tr>/gi, ' |\n');

  // 6. Block tag boundaries to newlines
  s = s.replace(
    /<\/(?:p|div|section|article|main|header|footer|nav|blockquote|tr|table|dt|dd|details)>/gi,
    '\n'
  );
  s = s.replace(
    /<(?:p|div|section|article|main|header|footer|nav|blockquote|tr|table|dt|dd|details)[^>]*>/gi,
    '\n'
  );
  s = s.replace(/<br\s*[\/]?>/gi, '\n');
  s = s.replace(/<hr\s*[\/]?>/gi, '\n---\n');

  // 7. Strip all remaining HTML tags
  s = s.replace(/<[^>]+>/g, ' ');

  // 8. Decode HTML entities thoroughly
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&bull;/gi, '•')
    .replace(/&copy;/gi, '©')
    .replace(/&reg;/gi, '®')
    .replace(/&trade;/gi, '™')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return n > 0 && n < 65536 ? String.fromCharCode(n) : ' ';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const n = parseInt(hex, 16);
      return n > 0 && n < 65536 ? String.fromCharCode(n) : ' ';
    });

  // 9. Clean up whitespace and line breaks
  const lines = s
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  return lines.join('\n');
}

/**
 * Universal Page Entity & Content Mining
 */
function extractPageEntitiesAndContent(html: string, pageUrl: string): ExtractedPageData {
  const entities: ExtractedPageData['entities'] = {
    phones: [],
    emails: [],
    whatsapp: [],
    addresses: [],
    pricing: [],
    faqs: [],
  };

  // 1. JSON-LD schema extraction (Organization, LocalBusiness, FAQPage, Product, Service)
  const jsonLdMatches = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );
  const schemaTexts: string[] = [];

  for (const m of jsonLdMatches) {
    try {
      const rawJson = m[1].trim();
      // Skip if rawJson looks like serialized Next.js code tokens
      if (rawJson.startsWith('$') || !rawJson.startsWith('{') && !rawJson.startsWith('[')) continue;
      const data = JSON.parse(rawJson);
      const items = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        if (item.telephone) {
          if (Array.isArray(item.telephone)) entities.phones.push(...item.telephone);
          else entities.phones.push(String(item.telephone));
        }
        if (item.email) {
          if (Array.isArray(item.email)) entities.emails.push(...item.email);
          else entities.emails.push(String(item.email));
        }
        if (item.address) {
          const a = item.address;
          const aStr =
            typeof a === 'string'
              ? a
              : [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
                  .filter(Boolean)
                  .join(', ');
          if (aStr) entities.addresses.push(aStr);
        }
        if (item.priceRange) {
          entities.pricing.push(String(item.priceRange));
        }
        if (item.description) schemaTexts.push(String(item.description));
        if (item.articleBody) schemaTexts.push(String(item.articleBody));
        if (item.mainEntity && Array.isArray(item.mainEntity)) {
          for (const q of item.mainEntity) {
            if (q.name && q.acceptedAnswer?.text) {
              entities.faqs.push({
                question: String(q.name),
                answer: String(q.acceptedAnswer.text),
              });
            }
          }
        }
      }
    } catch {
      // ignore malformed json-ld
    }
  }

  // 2. Direct href attributes for tel, mailto, whatsapp
  const telMatches = Array.from(html.matchAll(/href=["']tel:([^"'\s]+)["']/gi));
  for (const tm of telMatches) entities.phones.push(tm[1].trim());

  const mailtoMatches = Array.from(html.matchAll(/href=["']mailto:([^"?']+)["']/gi));
  for (const mm of mailtoMatches) entities.emails.push(mm[1].trim());

  const waMatches = Array.from(html.matchAll(/(?:wa\.me\/|phone=|\/send\?phone=)([0-9+]+)/gi));
  for (const wm of waMatches) entities.whatsapp.push(wm[1].trim());

  // 3. Extract Clean Content Text
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const title = (ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1] : 'Website Page').trim();

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const meta_description = descMatch ? descMatch[1].trim() : '';

  const mainCleanText = htmlToCleanText(html);

  // 4. Extract Entities from CLEAN TEXT (Never on raw HTML scripts/styles!)
  // Phones: Indian mobile/toll-free + International formats
  const phonePatterns = [
    /(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b|1800[\s-]?\d{3}[\s-]?\d{3,4}\b/g,
    /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
  ];
  for (const pp of phonePatterns) {
    const pMatches = mainCleanText.match(pp) || [];
    for (const p of pMatches) {
      const cleanDigits = p.replace(/\D/g, '');
      if (cleanDigits.length >= 8 && cleanDigits.length <= 15 && !p.match(/^(19|20)\d{2}$/)) {
        entities.phones.push(p.trim());
      }
    }
  }

  // Emails from clean text
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const rawEmails = mainCleanText.match(emailRegex) || [];
  for (const em of rawEmails) {
    const l = em.toLowerCase();
    if (
      !l.endsWith('.png') &&
      !l.endsWith('.jpg') &&
      !l.endsWith('.svg') &&
      !l.endsWith('.webp') &&
      !l.includes('example.com') &&
      !l.includes('schema.org') &&
      !l.includes('sentry.io') &&
      !l.includes('w3.org')
    ) {
      entities.emails.push(em.trim());
    }
  }

  // Global Pricing mentions from clean text (₹, $, €, £, AED, CAD, AUD, JPY, INR)
  const priceRegex =
    /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP|C\$|A\$|AED|¥)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:\/|per)\s*(?:month|mo|year|yr|annum|day|hour|seat|user|chat|project|license|item))?/gi;
  const priceMatches = mainCleanText.match(priceRegex) || [];
  for (const pr of priceMatches) {
    const cleanPr = pr.trim();
    // Exclude Next.js serialized numbers
    if (!/^\$(1[0-9]|2[0-9]|[0-9])$/.test(cleanPr)) {
      entities.pricing.push(cleanPr);
    }
  }

  // Deduplicate and filter entities
  entities.phones = Array.from(new Set(entities.phones.map((p) => p.replace(/\s+/g, ' ').trim())))
    .filter((p) => p.replace(/\D/g, '').length >= 8)
    .slice(0, 8);
  entities.emails = Array.from(new Set(entities.emails.map((e) => e.toLowerCase().trim()))).slice(0, 8);
  entities.whatsapp = Array.from(new Set(entities.whatsapp.map((w) => w.trim()))).slice(0, 4);
  entities.pricing = Array.from(new Set(entities.pricing)).slice(0, 10);
  entities.addresses = Array.from(new Set(entities.addresses.map((a) => a.trim()))).slice(0, 5);

  // 5. Build Final Content Block
  const textBlocks: string[] = [];
  if (meta_description) textBlocks.push(`Description: ${meta_description}`);
  if (mainCleanText) textBlocks.push(mainCleanText);
  if (schemaTexts.length > 0) textBlocks.push(schemaTexts.join('\n'));

  // Append Ground-Truth Business Facts section if entities discovered on this page
  if (
    entities.phones.length > 0 ||
    entities.emails.length > 0 ||
    entities.pricing.length > 0 ||
    entities.addresses.length > 0
  ) {
    const factLines = ['\n\n## 📌 Verified Business & Contact Facts'];
    if (entities.phones.length > 0) {
      factLines.push(`- **Phone / Helpline:** ${entities.phones.join(', ')}`);
    }
    if (entities.emails.length > 0) {
      factLines.push(`- **Support Email:** ${entities.emails.join(', ')}`);
    }
    if (entities.whatsapp.length > 0) {
      factLines.push(`- **WhatsApp Support:** ${entities.whatsapp.join(', ')}`);
    }
    if (entities.addresses.length > 0) {
      factLines.push(`- **Address:** ${entities.addresses.join(' | ')}`);
    }
    if (entities.pricing.length > 0) {
      factLines.push(`- **Discovered Pricing & Plans:** ${entities.pricing.join(', ')}`);
    }
    textBlocks.push(factLines.join('\n'));
  }

  const cleanedContent = textBlocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  const wordCount = cleanedContent.split(/\s+/).filter(Boolean).length;
  const contentHash = crypto.createHash('sha256').update(cleanedContent).digest('hex');

  return {
    url: pageUrl,
    title,
    meta_description,
    content: cleanedContent,
    content_hash: contentHash,
    word_count: wordCount,
    status: wordCount > 5 ? 'completed' : 'failed',
    entities,
  };
}

/**
 * Universal Single URL Live Fetcher & Extractor
 * Fetches and parses a single webpage in real-time, extracting clean text and business entities.
 */
export async function fetchAndExtractPage(rawUrl: string): Promise<ExtractedPageData | null> {
  try {
    const normUrl = normalizeUrl(rawUrl);
    const res = await fetch(normUrl, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn(`[fetchAndExtractPage] Failed with status ${res.status} for ${normUrl}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }

    const html = await res.text();
    const extracted = extractPageEntitiesAndContent(html, normUrl);
    return extracted;
  } catch (err: any) {
    console.warn(`[fetchAndExtractPage] Error fetching ${rawUrl}:`, err.message);
    return null;
  }
}

/**
 * Universal BFS Crawler Implementation
 */
export async function runNativeCrawl(
  jobId: string,
  chatbotId: string,
  workspaceId: string,
  rawUrl: string
): Promise<void> {
  const startUrl = normalizeUrl(rawUrl);
  const outputFile = getJobStateFile(jobId);

  const jobState: CrawlJob & { pages: any[] } = {
    id: jobId,
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    start_url: startUrl,
    status: 'crawling',
    pages_discovered: 1,
    pages_processed: 0,
    pages_failed: 0,
    current_page: startUrl,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pages: [],
  };

  const persistState = () => {
    jobState.updated_at = new Date().toISOString();
    inMemoryCrawlJobs.set(jobId, jobState);
    try {
      fs.writeFileSync(outputFile, JSON.stringify(jobState, null, 2));
    } catch {}
  };

  persistState();

  console.log(`[UNIVERSAL CRAWLER] Starting live crawl for ${startUrl} (Job: ${jobId})`);
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  visited.add(startUrl);

  // 1. Probe standard sitemap locations
  try {
    const parsedStart = new URL(startUrl);
    const sitemapCandidates = [
      `${parsedStart.protocol}//${parsedStart.host}/sitemap.xml`,
      `${parsedStart.protocol}//${parsedStart.host}/sitemap_index.xml`,
      `${parsedStart.protocol}//${parsedStart.host}/wp-sitemap.xml`,
      `${parsedStart.protocol}//${parsedStart.host}/sitemap-pages.xml`,
    ];

    for (const sitemapUrl of sitemapCandidates) {
      try {
        const sitemapRes = await fetch(sitemapUrl, {
          headers: BROWSER_HEADERS,
          signal: AbortSignal.timeout(6000),
        });
        if (sitemapRes.ok) {
          const sitemapXml = await sitemapRes.text();
          const locMatches = Array.from(sitemapXml.matchAll(/<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi));
          let addedFromSitemap = 0;
          for (const lm of locMatches) {
            const discovered = normalizeUrl(lm[1]);
            if (!visited.has(discovered) && isSameDomain(startUrl, discovered)) {
              visited.add(discovered);
              queue.push(discovered);
              jobState.pages_discovered++;
              addedFromSitemap++;
              if (queue.length >= 40) break;
            }
          }
          if (addedFromSitemap > 0) {
            console.log(`[UNIVERSAL CRAWLER] Discovered ${addedFromSitemap} pages from ${sitemapUrl}`);
            persistState();
            break;
          }
        }
      } catch {}
    }
  } catch (err: any) {
    console.warn(`[UNIVERSAL CRAWLER] Sitemap probe skipped:`, err.message);
  }

  // 2. Prioritize high-value business pages in queue
  const highValueKeywords = [
    'about',
    'company',
    'service',
    'product',
    'pricing',
    'plan',
    'contact',
    'faq',
    'policy',
    'terms',
    'privacy',
    'refund',
  ];
  queue.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aPriority = highValueKeywords.some((k) => aLower.includes(k)) ? 1 : 0;
    const bPriority = highValueKeywords.some((k) => bLower.includes(k)) ? 1 : 0;
    return bPriority - aPriority;
  });

  const MAX_PAGES = 30;

  // 3. BFS Traversal Loop
  while (queue.length > 0 && jobState.pages_processed < MAX_PAGES) {
    const currentUrl = queue.shift()!;
    jobState.current_page = currentUrl;
    persistState();

    try {
      const res = await fetch(currentUrl, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        jobState.pages_failed++;
        persistState();
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        continue;
      }

      const html = await res.text();
      const extracted = extractPageEntitiesAndContent(html, currentUrl);

      if (extracted.status === 'completed' && extracted.word_count > 10) {
        // Prevent duplicate canonical content
        const existsAlready = jobState.pages.some(
          (p) => p.url === extracted.url || p.content_hash === extracted.content_hash
        );
        if (!existsAlready) {
          jobState.pages.push(extracted);
          jobState.pages_processed++;
        }
      } else {
        jobState.pages_failed++;
      }

      // Discover internal links
      const hrefMatches = Array.from(html.matchAll(/href=["']([^"'#\s>]+)["']/gi));
      for (const hm of hrefMatches) {
        const rawHref = hm[1].trim();
        if (
          !rawHref ||
          rawHref.startsWith('javascript:') ||
          rawHref.startsWith('mailto:') ||
          rawHref.startsWith('tel:') ||
          rawHref.startsWith('#') ||
          rawHref.startsWith('data:')
        ) {
          continue;
        }

        try {
          const resolved = normalizeUrl(new URL(rawHref, currentUrl).toString());
          if (
            !visited.has(resolved) &&
            isSameDomain(startUrl, resolved) &&
            !resolved.match(
              /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|tar|gz|css|js|map|woff|woff2|ttf|eot|mp4|mp3|avi|mov|json|xml|txt|rss|atom)$/i
            )
          ) {
            visited.add(resolved);
            queue.push(resolved);
            jobState.pages_discovered++;
          }
        } catch {}
      }

      persistState();
    } catch (fetchErr: any) {
      console.warn(`[UNIVERSAL CRAWLER] Error fetching ${currentUrl}:`, fetchErr.message);
      jobState.pages_failed++;
      persistState();
    }
  }

  // 4. Handle Empty/Failed Crawls Gracefully
  if (jobState.pages_processed === 0) {
    console.warn(`[UNIVERSAL CRAWLER] Could not extract readable pages from ${startUrl}`);
    jobState.status = 'failed';
    jobState.error_message = `Could not extract readable pages from ${startUrl}. Please verify the website is online and allows public access.`;
    jobState.completed_at = new Date().toISOString();
    persistState();
    return;
  }

  await finalizeCrawlJob(jobState, workspaceId, chatbotId, startUrl);
}

/**
 * Finalize Job: Convert to Sources, Synthesize Profile & Index Vector Embeddings
 */
async function finalizeCrawlJob(
  jobState: CrawlJob & { pages: any[] },
  workspaceId: string,
  chatbotId: string,
  startUrl: string
): Promise<void> {
  jobState.status = 'completed';
  jobState.completed_at = new Date().toISOString();
  jobState.updated_at = new Date().toISOString();

  // Persist IMMEDIATELY so any active status poll or UI refresh sees 'completed'
  inMemoryCrawlJobs.set(jobState.id, jobState);
  try {
    fs.writeFileSync(getJobStateFile(jobState.id), JSON.stringify(jobState, null, 2));
  } catch {}

  // 1. Convert pages to KnowledgeSources
  const sources: KnowledgeSource[] = jobState.pages.map((p) => ({
    id: 'src-' + Math.random().toString(36).substring(2, 9),
    workspace_id: workspaceId,
    chatbot_id: chatbotId,
    source_type: 'website' as const,
    url: p.url,
    title: p.title,
    content: p.content,
    content_hash: p.content_hash,
    status: 'completed',
    word_count: p.word_count || 0,
    crawled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Deduplicate and filter out stale sources from other domains
  const existingDocs = (inMemoryKnowledgeSources.get(chatbotId) || []).filter(
    (s) =>
      s.source_type !== 'website' && !s.url.includes('#verified-business-profile')
        ? true
        : isSameDomain(startUrl, s.url)
  );
  const sourceMap = new Map<string, KnowledgeSource>();
  for (const s of existingDocs) sourceMap.set(normalizeUrl(s.url), s);
  for (const s of sources) sourceMap.set(normalizeUrl(s.url), s);
  const finalSources = Array.from(sourceMap.values());
  inMemoryKnowledgeSources.set(chatbotId, finalSources);
  saveSourcesToDisk(chatbotId, finalSources);

  // Sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      for (const src of sources) {
        await supabase.from('knowledge_sources').upsert(
          {
            id: src.id,
            workspace_id: workspaceId,
            chatbot_id: chatbotId,
            source_type: 'website',
            url: src.url,
            title: src.title,
            content: src.content,
            content_hash: src.content_hash,
            status: src.status,
            word_count: src.word_count,
            crawled_at: src.crawled_at,
            created_at: src.created_at,
            updated_at: src.updated_at,
          },
          { onConflict: 'chatbot_id,url' }
        );
      }
    } catch (err: any) {
      console.warn('[UNIVERSAL CRAWLER] Supabase upsert error:', err.message);
    }
  }

  // 2. Synthesize Master Business Profile
  try {
    const synth = await synthesizeMasterBusinessProfile(
      workspaceId,
      chatbotId,
      startUrl,
      jobState.pages
    );
    console.log(
      `[UNIVERSAL CRAWLER] Successfully synthesized Master Business Profile for ${chatbotId}:`,
      {
        phones: synth.entities.phones.length,
        emails: synth.entities.emails.length,
        pricing: synth.entities.pricing.length,
      }
    );
  } catch (synthErr: any) {
    console.error('[UNIVERSAL CRAWLER] Master synthesis error:', synthErr);
  }

  // 3. Process all knowledge sources into vector embeddings
  try {
    await processAllKnowledgeSourcesForChatbot(workspaceId, chatbotId);
    console.log(
      `[UNIVERSAL CRAWLER] Knowledge sources successfully chunked and embedded for ${chatbotId}`
    );
  } catch (procErr: any) {
    console.error('[UNIVERSAL CRAWLER] Embedding processing error:', procErr);
  }

  // Persist final state with chunk references
  inMemoryCrawlJobs.set(jobState.id, jobState);
  try {
    fs.writeFileSync(getJobStateFile(jobState.id), JSON.stringify(jobState, null, 2));
  } catch {}
}
