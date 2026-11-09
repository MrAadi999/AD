import * as crypto from 'crypto';
import { createAdminClient } from '../supabase/admin';
import { isSupabaseConfigured } from '../supabase/client';
import { ApiKeyEnvironment, ApiKeyRecord, CreateApiKeyResponse } from './types';

/**
 * Generate a cryptographically secure API key.
 * Returns the plaintext key (to show once), the masked prefix, and the SHA-256 hash.
 */
export function generateApiKey(environment: ApiKeyEnvironment = 'live'): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
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
 * Create a new API key for a workspace strictly in Supabase Postgres.
 * Plaintext key is returned ONLY in this response and never persisted.
 */
export async function createApiKey(params: {
  workspaceId: string;
  name: string;
  environment?: ApiKeyEnvironment;
}): Promise<CreateApiKeyResponse> {
  const { workspaceId, name } = params;
  const environment: ApiKeyEnvironment = params.environment === 'test' ? 'test' : 'live';

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured. Cannot create API key.');
  }

  const cleanName = (name || '').trim() || `${environment === 'live' ? 'Production' : 'Test'} API Key`;
  const { rawKey, keyPrefix, keyHash } = generateApiKey(environment);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase
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
    });

  if (error) {
    throw new Error(`Database error creating API key: ${error.message}`);
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
 * List all API keys for a workspace strictly from Supabase Postgres.
 */
export async function listApiKeys(workspaceId: string): Promise<ApiKeyRecord[]> {
  if (!workspaceId) return [];

  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, workspace_id, name, key_prefix, environment, last_used_at, expires_at, revoked_at, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Database error fetching API keys: ${error.message}`);
  }

  return (data as ApiKeyRecord[]) || [];
}

/**
 * Revoke an API key immediately in Supabase Postgres.
 */
export async function revokeApiKey(
  workspaceId: string,
  keyId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database error: Supabase is not configured.');
  }

  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: now, updated_at: now })
    .eq('id', keyId)
    .eq('workspace_id', workspaceId);

  if (error) {
    throw new Error(`Database error revoking API key: ${error.message}`);
  }

  return true;
}

export interface AuthKeyResult {
  ok: boolean;
  apiKey?: ApiKeyRecord;
  status?: number;
  code?: string;
  message?: string;
}

/**
 * Authenticate incoming Bearer API key against Supabase Postgres.
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

  if (!rawKey.startsWith('bs_live_') && !rawKey.startsWith('bs_test_')) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_api_key',
      message: 'Invalid API key format. API keys must start with bs_live_ or bs_test_.',
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 500,
      code: 'database_unavailable',
      message: 'Database connection is not configured.',
    };
  }

  const keyHash = hashApiKey(rawKey);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      code: 'database_error',
      message: `Database lookup failed: ${error.message}`,
    };
  }

  if (!data) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_api_key',
      message: 'The provided API key does not exist or is invalid.',
    };
  }

  const foundKey = data as ApiKeyRecord;

  // Check revocation
  if (foundKey.revoked_at) {
    return {
      ok: false,
      status: 401,
      code: 'revoked_api_key',
      message: 'This API key has been revoked and can no longer be used.',
    };
  }

  // Check expiration
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

  // Update last_used_at
  const now = new Date().toISOString();
  foundKey.last_used_at = now;

  supabase
    .from('api_keys')
    .update({ last_used_at: now })
    .eq('id', foundKey.id)
    .then()
    .catch((err) => console.warn('[ApiKeyService] Error updating last_used_at:', err.message));

  return {
    ok: true,
    apiKey: foundKey,
  };
}
