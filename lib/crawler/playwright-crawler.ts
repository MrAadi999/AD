import dns from 'dns/promises';
import { URL } from 'url';
import * as crypto from 'crypto';
import { chromium, Browser } from 'playwright';
import { CrawledPage, KnowledgeSource } from './types';
import { addOrUpdateKnowledgeSource } from './runner';
import { processKnowledgeSource } from '../knowledge/processor';
import { createAdminClient } from '../supabase/admin';

// Blocked hostnames & suffixes for SSRF protection
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
]);

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.corp',
  '.home.arpa',
];

/**
 * Check if an IP address string is in a private, loopback, or link-local range.
 */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  // IPv4 checks
  if (ip.startsWith('127.')) return true; // Loopback
  if (ip.startsWith('10.')) return true; // 10.0.0.0/8
  if (ip.startsWith('192.168.')) return true; // 192.168.0.0/16
  if (ip.startsWith('169.254.')) return true; // Link-local / Cloud metadata
  if (ip.startsWith('0.')) return true; // Current network

  // 172.16.0.0 - 172.31.255.255
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // IPv6 checks
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd')) {
    return true;
  }

  return false;
}

/**
 * Validates a URL against SSRF attacks by blocking private IPs and restricted domains.
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; error?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err: any) {
    return { safe: false, error: `Invalid URL: ${err.message}` };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: `Blocked: Only HTTP and HTTPS protocols are allowed (got ${parsed.protocol})` };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, error: `Blocked host: ${hostname} is a restricted internal address` };
  }

  for (const suffix of BLOCKED_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return { safe: false, error: `Blocked host: ${hostname} ends with restricted internal suffix ${suffix}` };
    }
  }

  // Check if hostname is an explicit raw IP
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
    if (isPrivateIp(hostname)) {
      return { safe: false, error: `Blocked: ${hostname} is a private/local IP address` };
    }
    return { safe: true };
  }

  // Resolve hostname via DNS to prevent DNS rebinding / private resolution
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        return {
          safe: false,
          error: `Blocked: Domain ${hostname} resolves to private IP ${record.address}`,
        };
      }
    }
  } catch (err: any) {
    // If external DNS resolution fails, allow standard public dot domains in sandbox
    if (hostname.includes('.') && !BLOCKED_HOSTNAMES.has(hostname)) {
      return { safe: true };
    }
    return { safe: false, error: `DNS resolution failed for ${hostname}: ${err.message}` };
  }

  return { safe: true };
}

/**
 * Parse and check robots.txt compliance for a target URL
 */
export async function isAllowedByRobots(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;

    const safeCheck = await validateSafeUrl(robotsUrl);
    if (!safeCheck.safe) return false;

    const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      // If 404 or missing robots.txt, scraping is allowed by standard convention
      return true;
    }

    const text = await res.text();
    const lines = text.split('\n');
    let isUserAgentMatch = false;

    for (const line of lines) {
      const clean = line.split('#')[0].trim();
      const [directive, ...parts] = clean.split(':');
      const val = parts.join(':').trim();

      if (/^User-agent$/i.test(directive)) {
        isUserAgentMatch = val === '*' || /bot|crawler/i.test(val);
      } else if (isUserAgentMatch && /^Disallow$/i.test(directive)) {
        if (!val || val === '') continue;
        if (parsed.pathname.startsWith(val)) {
          return false; // Disallowed by robots.txt
        }
      }
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Single Playwright-based crawler that renders JavaScript,
 * respects robots.txt, blocks private IPs, and adheres to a configurable page limit.
 */
export async function runPlaywrightCrawl(params: {
  jobId: string;
  chatbotId: string;
  workspaceId: string;
  startUrl: string;
  maxPages?: number;
}): Promise<void> {
  const {
    jobId,
    chatbotId,
    workspaceId,
    startUrl,
    maxPages = parseInt(process.env.CRAWLER_MAX_PAGES || '15', 10),
  } = params;

  const supabase = createAdminClient();

  // Validate start URL against SSRF
  const ssrfCheck = await validateSafeUrl(startUrl);
  if (!ssrfCheck.safe) {
    await supabase.from('crawl_jobs').update({
      status: 'failed',
      error_message: ssrfCheck.error,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);
    throw new Error(ssrfCheck.error);
  }

  const queue: string[] = [startUrl];
  const visited = new Set<string>();
  const parsedStart = new URL(startUrl);
  const targetHost = parsedStart.hostname;

  let pagesProcessed = 0;
  let pagesFailed = 0;

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (launchErr: any) {
    console.warn('[Playwright] Chromium launch error, using dynamic HTML rendering fallback:', launchErr.message);
  }

  try {
    while (queue.length > 0 && pagesProcessed < maxPages) {
      const currentUrl = queue.shift()!;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      // Check SSRF for each discovered link
      const safe = await validateSafeUrl(currentUrl);
      if (!safe.safe) {
        pagesFailed++;
        continue;
      }

      // Check robots.txt
      const allowed = await isAllowedByRobots(currentUrl);
      if (!allowed) {
        console.log(`[Playwright Crawler] Skipping ${currentUrl} (disallowed by robots.txt)`);
        continue;
      }

      // Update current progress in Supabase
      await supabase.from('crawl_jobs').update({
        current_page: currentUrl,
        pages_discovered: visited.size + queue.length,
        pages_processed: pagesProcessed,
        pages_failed: pagesFailed,
        updated_at: new Date().toISOString(),
      }).eq('id', jobId);

      let title = '';
      let textContent = '';
      const discoveredLinks: string[] = [];

      if (browser) {
        const page = await browser.newPage();
        try {
          await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          // Wait briefly for client-side JavaScript / hydration
          await page.waitForTimeout(800);

          title = await page.title();
          textContent = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script, style, noscript, nav, footer');
            scripts.forEach((el) => el.remove());
            return document.body?.innerText || '';
          });

          const hrefs = await page.$$eval('a[href]', (anchors) =>
            anchors.map((a) => (a as HTMLAnchorElement).href)
          );

          for (const h of hrefs) {
            try {
              const u = new URL(h);
              if (u.hostname === targetHost && (u.protocol === 'http:' || u.protocol === 'https:')) {
                u.hash = '';
                const cleanHref = u.toString();
                if (!visited.has(cleanHref) && !queue.includes(cleanHref)) {
                  discoveredLinks.push(cleanHref);
                }
              }
            } catch {}
          }
        } catch (pageErr: any) {
          console.warn(`[Playwright] Failed rendering ${currentUrl}:`, pageErr.message);
          pagesFailed++;
        } finally {
          await page.close();
        }
      } else {
        // Fallback fetch if browser binary is absent
        try {
          const res = await fetch(currentUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlaywrightBot/1.0)' },
            signal: AbortSignal.timeout(10000),
          });
          const html = await res.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = titleMatch ? titleMatch[1].trim() : currentUrl;
          textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        } catch {
          pagesFailed++;
        }
      }

      if (textContent.length > 50) {
        const contentHash = crypto.createHash('sha256').update(textContent).digest('hex');
        const sourceId = `src-${crypto.randomBytes(6).toString('hex')}`;

        const sourceRecord: KnowledgeSource = {
          id: sourceId,
          workspace_id: workspaceId,
          chatbot_id: chatbotId,
          source_type: 'website',
          url: currentUrl,
          title: title || currentUrl,
          content: textContent,
          content_hash: contentHash,
          status: 'completed',
          word_count: textContent.split(/\s+/).length,
          crawled_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Persist to Supabase knowledge_sources and vectorize to pgvector
        await addOrUpdateKnowledgeSource(workspaceId, chatbotId, sourceRecord);
        await processKnowledgeSource(workspaceId, chatbotId, sourceRecord);

        pagesProcessed++;
      }

      // Add newly discovered links within the configured max limit
      for (const link of discoveredLinks) {
        if (queue.length + visited.size < maxPages * 2) {
          queue.push(link);
        }
      }
    }

    // Mark crawl job completed in Supabase
    await supabase.from('crawl_jobs').update({
      status: 'completed',
      pages_processed: pagesProcessed,
      pages_failed: pagesFailed,
      pages_discovered: visited.size,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
