import { AgentToolHandler, ToolExecutionContext, ToolExecutionResult } from './base';
import { isSsrfTarget } from './http-get';

export const ConfiguredApiTool: AgentToolHandler = {
  type: 'configured_api',
  name: 'configured_api',
  description:
    'Send parameters to a workspace pre-configured business API endpoint (e.g. CRM lead capture, inventory lookup).',
  input_schema: {
    type: 'object',
    properties: {
      params: {
        type: 'object',
        description: 'Key-value parameters to pass to the configured business API',
      },
    },
    required: ['params'],
  },
  async execute(
    input: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const config = context.config || {};
    const endpoint = config.endpoint;

    if (!endpoint || typeof endpoint !== 'string') {
      return {
        success: false,
        error: 'Tool configuration error: No endpoint configured for this API tool.',
        latency_ms: Date.now() - startTime,
      };
    }

    // SSRF Check on configured endpoint
    try {
      const parsed = new URL(endpoint);
      const ssrfCheck = isSsrfTarget(parsed.hostname);
      if (ssrfCheck.blocked) {
        return {
          success: false,
          error: `Security violation (SSRF): ${ssrfCheck.reason}`,
          latency_ms: Date.now() - startTime,
        };
      }
    } catch {
      return {
        success: false,
        error: `Malformed configured endpoint URL: "${endpoint}"`,
        latency_ms: Date.now() - startTime,
      };
    }

    const method = (config.method || 'POST').toUpperCase();
    const allowedParams: string[] = config.allowed_params || [];
    const rawParams = input.params || {};

    // Filter parameters against allowed_params if configured
    const safeParams: Record<string, any> = {};
    if (allowedParams.length > 0) {
      for (const key of allowedParams) {
        if (rawParams[key] !== undefined) {
          safeParams[key] = rawParams[key];
        }
      }
    } else {
      Object.assign(safeParams, rawParams);
    }

    // Prepare headers: attach configured server headers (secrets are kept on server only)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'BiharStackAI-Agent/1.0',
      ...(config.headers || {}),
    };

    const timeout = context.timeoutMs || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let url = endpoint;
      let body: string | undefined = undefined;

      if (method === 'GET') {
        const u = new URL(endpoint);
        Object.entries(safeParams).forEach(([k, v]) => {
          u.searchParams.append(k, String(v));
        });
        url = u.toString();
      } else {
        body = JSON.stringify(safeParams);
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      let responseData: any;
      if (contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        responseData = text.slice(0, 10000);
      }

      return {
        success: res.ok,
        data: {
          status: res.status,
          response: responseData,
          is_untrusted_data: true,
        },
        error: !res.ok ? `API returned status ${res.status}` : undefined,
        latency_ms: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Configured API request timed out.' : err.message,
        latency_ms: Date.now() - startTime,
      };
    }
  },
};
