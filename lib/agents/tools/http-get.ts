import { AgentToolHandler, ToolExecutionContext, ToolExecutionResult } from './base';

const MAX_RESPONSE_BYTES = 50 * 1024; // 50 KB max
const DEFAULT_TIMEOUT_MS = 10 * 1000; // 10 seconds

/**
 * Check if an IP address or hostname is a private/internal/cloud metadata address (SSRF Protection)
 */
export function isSsrfTarget(hostname: string): { blocked: boolean; reason?: string } {
  const host = hostname.toLowerCase().trim();

  // 1. Common local/internal hostnames
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.corp')
  ) {
    return { blocked: true, reason: 'Access to loopback or local network addresses is prohibited.' };
  }

  // 2. Cloud metadata endpoints
  if (
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host === 'metadata' ||
    host.includes('instance-data')
  ) {
    return { blocked: true, reason: 'Access to cloud instance metadata services is prohibited.' };
  }

  // 3. IPv4 range checks
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map((n) => parseInt(n, 10));

    // Valid octets check
    if (octets.some((o) => o < 0 || o > 255)) {
      return { blocked: true, reason: 'Invalid IP address.' };
    }

    const [a, b] = octets;

    // 0.0.0.0/8
    if (a === 0) return { blocked: true, reason: 'Access to 0.0.0.0/8 is prohibited.' };
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return { blocked: true, reason: 'Access to loopback network 127.0.0.0/8 is prohibited.' };
    // 10.0.0.0/8 (Private Class A)
    if (a === 10) return { blocked: true, reason: 'Access to private network 10.0.0.0/8 is prohibited.' };
    // 172.16.0.0/12 (Private Class B)
    if (a === 172 && b >= 16 && b <= 31) {
      return { blocked: true, reason: 'Access to private network 172.16.0.0/12 is prohibited.' };
    }
    // 192.168.0.0/16 (Private Class C)
    if (a === 192 && b === 168) {
      return { blocked: true, reason: 'Access to private network 192.168.0.0/16 is prohibited.' };
    }
    // 169.254.0.0/16 (Link-Local / AWS metadata)
    if (a === 169 && b === 254) {
      return { blocked: true, reason: 'Access to link-local network 169.254.0.0/16 is prohibited.' };
    }
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) {
      return { blocked: true, reason: 'Access to shared CGNAT network is prohibited.' };
    }
    // 224.0.0.0+ (Multicast & Broadcast)
    if (a >= 224) {
      return { blocked: true, reason: 'Access to multicast/reserved IP ranges is prohibited.' };
    }
  }

  return { blocked: false };
}

export const HttpGetTool: AgentToolHandler = {
  type: 'http_request',
  name: 'http_request',
  description:
    'Fetch text, documentation, or JSON data from an authorized public HTTP/HTTPS URL. Strictly read-only with SSRF defense.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The public web URL to fetch (must start with http:// or https://)',
      },
    },
    required: ['url'],
  },
  async execute(
    input: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const urlStr = String(input.url || '').trim();

    if (!urlStr) {
      return {
        success: false,
        error: 'Missing required "url" parameter.',
        latency_ms: Date.now() - startTime,
      };
    }

    // 1. Protocol Validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlStr);
    } catch {
      return {
        success: false,
        error: `Malformed URL "${urlStr}".`,
        latency_ms: Date.now() - startTime,
      };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        success: false,
        error: `Protocol "${parsedUrl.protocol}" is blocked. Only http:// and https:// are permitted.`,
        latency_ms: Date.now() - startTime,
      };
    }

    // 2. SSRF Hostname & IP Validation
    const ssrfCheck = isSsrfTarget(parsedUrl.hostname);
    if (ssrfCheck.blocked) {
      return {
        success: false,
        error: `Security violation (SSRF): ${ssrfCheck.reason}`,
        latency_ms: Date.now() - startTime,
      };
    }

    // 3. Domain Allowlist Check (if configured on the tool)
    const allowedDomains: string[] = context.config?.allowed_domains || [];
    if (allowedDomains.length > 0) {
      const host = parsedUrl.hostname.toLowerCase();
      const isAllowed = allowedDomains.some((d) => {
        const cleanD = d.toLowerCase().trim();
        return host === cleanD || host.endsWith(`.${cleanD}`);
      });

      if (!isAllowed) {
        return {
          success: false,
          error: `Domain "${parsedUrl.hostname}" is not in this agent's allowed domains list.`,
          latency_ms: Date.now() - startTime,
        };
      }
    }

    // 4. Execute Fetch with AbortController Timeout
    const timeout = context.timeoutMs || DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'BiharStackAI-Agent/1.0 (+https://biharstack.ai)',
          Accept: 'text/html,application/json,text/plain;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          success: false,
          error: `Remote HTTP server returned status ${res.status} ${res.statusText}.`,
          latency_ms: Date.now() - startTime,
        };
      }

      // 5. Read and truncate response body safely
      const rawText = await res.text();
      let content = rawText;
      let truncated = false;

      if (content.length > MAX_RESPONSE_BYTES) {
        content = content.slice(0, MAX_RESPONSE_BYTES) + '\n...[Content truncated for token safety]';
        truncated = true;
      }

      return {
        success: true,
        data: {
          url: parsedUrl.toString(),
          status: res.status,
          content: content,
          truncated,
          is_untrusted_data: true,
        },
        latency_ms: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      return {
        success: false,
        error: isAbort
          ? `Request timed out after ${timeout / 1000}s.`
          : `HTTP fetch failed: ${err.message}`,
        latency_ms: Date.now() - startTime,
      };
    }
  },
};
