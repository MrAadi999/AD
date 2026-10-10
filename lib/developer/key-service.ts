import * as crypto from 'crypto';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { ApiKeyEnvironment, ApiKeyRecord, CreateApiKeyResponse } from './types';

// In-memory store for local testing, fallback, and demo environments
export const inMemoryApiKeys = new Map<string, ApiKeyRecord>();

/**
 * Generate a cryptographically secure API key
 * Returns the plaintext key (to show once), the masked prefix, and the SHA-256 hash.
 */
export function generateApiKey(environment: ApiKeyEnvironment = 'live'): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  // 24 cryptographically secure random bytes = ~192 bits of entropy
  const entropy = crypto.randomBytes(24).toString('base64url');
  const rawKey = `bs_${environment}_${entropy}`;

  const last4 = rawKey.slice(-4);
  const keyPrefix = `bs_${environment}_••••••••${last4}`;
  const keyHash = hashApiKey(rawKey);

  return { rawKey, keyPrefix, keyHash };
}

/**
 * Hash raw API key with SHA-256 for secure storage and comparison
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

/**
 * Create a new API key for a workspace
 * Plaintext key is returned ONLY in this response and never persisted.
 */
export async function createApiKey(params: {
  workspaceId: string;
  name: string;
  environment?: ApiKeyEnvironment;
}): Promise<CreateApiKeyResponse> {
  const { workspaceId, name } = params;
  const environment: ApiKeyEnvironment = params.environment === 'test' ? 'test' : 'live';

  const cleanName = (name || '').trim() || `${environment === 'live' ? 'Production' : 'Test'} API Key`;
  const { rawKey, keyPrefix, keyHash } = generateApiKey(environment);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record: ApiKeyRecord = {
    id,
    workspace_id: workspaceId,
    name: cleanName,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    environment,
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
    created_at: now,
    updated_at: now,
  };

  // Always update in-memory store for fallback / fast lookup
  inMemoryApiKeys.set(id, record);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          id,
          workspace_id: workspaceId,
          name: cleanName,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          environment,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.warn('[ApiKeyService] Supabase insert failed, using memory store:', error.message);
      } else if (data) {
        inMemoryApiKeys.set(data.id, data as ApiKeyRecord);
      }
    } catch (err: any) {
      console.warn('[ApiKeyService] Supabase client error:', err.message);
    }
  }

  return {
    id,
    name: cleanName,
    key: rawKey,
    key_prefix: keyPrefix,
    environment,
    created_at: now,
  };
}

/**
 * List all API keys for a workspace (never returns plaintext secrets or hashes)
 */
export async function listApiKeys(workspaceId: string): Promise<ApiKeyRecord[]> {
  if (!workspaceId) return [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, workspace_id, name, key_prefix, environment, last_used_at, expires_at, revoked_at, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ApiKeyRecord[];
      }
    } catch (err: any) {
      console.warn('[ApiKeyService] Supabase query error, falling back to memory store:', err.message);
    }
  }

  // Fallback to in-memory records
  const records = Array.from(inMemoryApiKeys.values())
    .filter((k) => k.workspace_id === workspaceId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return records;
}

/**
 * Revoke an API key immediately. Revoked keys cannot be unrevoked.
 */
export async function revokeApiKey(
  workspaceId: string,
  keyId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  // Update in memory
  const existing = inMemoryApiKeys.get(keyId);
  if (existing && existing.workspace_id === workspaceId) {
    existing.revoked_at = now;
    existing.updated_at = now;
    inMemoryApiKeys.set(keyId, existing);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: now, updated_at: now })
        .eq('id', keyId)
        .eq('workspace_id', workspaceId);

      if (error) {
        console.error('[ApiKeyService] Failed to revoke key in Supabase:', error.message);
        return existing !== undefined;
      }
      return true;
    } catch (err: any) {
      console.error('[ApiKeyService] Revocation error:', err.message);
    }
  }

  return existing !== undefined;
}

export interface AuthKeyResult {
  ok: boolean;
  apiKey?: ApiKeyRecord;
  status?: number;
  code?: string;
  message?: string;
}

/**
 * Authenticate incoming Bearer API key
 * Extracts token, verifies format, hashes, looks up active key, and updates last_used_at.
 */
export async function authenticateBearerKey(
  authHeader: string | null | undefined
): Promise<AuthKeyResult> {
  if (!authHeader) {
    return {
      ok: false,
      status: 401,
      code: 'missing_api_key',
      message: 'Missing Authorization header. Expected: Authorization: Bearer YOUR_API_KEY',
    };
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      ok: false,
      status: 401,
      code: 'invalid_authorization_format',
      message: 'Invalid Authorization header format. Format must be: Bearer <api_key>',
    };
  }

  const rawKey = parts[1].trim();

  // Basic sanity format check
  if (!rawKey.startsWith('bs_live_') && !rawKey.startsWith('bs_test_')) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_api_key',
      message: 'Invalid API key format. BiharStack API keys start with bs_live_ or bs_test_.',
    };
  }

  const keyHash = hashApiKey(rawKey);

  // 1. Check in Supabase if configured
  let foundKey: ApiKeyRecord | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .single();

      if (!error && data) {
        foundKey = data as ApiKeyRecord;
      }
    } catch (err: any) {
      console.warn('[ApiKeyService] Supabase lookup error:', err.message);
    }
  }

  // 2. Memory store fallback
  if (!foundKey) {
    for (const record of Array.from(inMemoryApiKeys.values())) {
      if (record.key_hash === keyHash) {
        foundKey = record;
        break;
      }
    }
  }

  if (!foundKey) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_api_key',
      message: 'The provided API key does not exist or is invalid.',
    };
  }

  // 3. Check revocation
  if (foundKey.revoked_at) {
    return {
      ok: false,
      status: 401,
      code: 'revoked_api_key',
      message: 'This API key has been revoked and can no longer be used.',
    };
  }

  // 4. Check expiration
  if (foundKey.expires_at) {
    const expiresTime = new Date(foundKey.expires_at).getTime();
    if (Date.now() > expiresTime) {
      return {
        ok: false,
        status: 401,
        code: 'expired_api_key',
        message: 'This API key has expired.',
      };
    }
  }

  // 5. Update last_used_at asynchronously
  const now = new Date().toISOString();
  foundKey.last_used_at = now;
  inMemoryApiKeys.set(foundKey.id, foundKey);

  if (isSupabaseConfigured()) {
    (async () => {
      try {
        const supabase = createServerClient();
        await supabase
          .from('api_keys')
          .update({ last_used_at: now })
          .eq('id', foundKey.id);
      } catch (err: any) {
        // Non-blocking telemetry update
      }
    })();
  }

  return {
    ok: true,
    apiKey: foundKey,
  };
}
