import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client initialized with SUPABASE_SERVICE_ROLE_KEY.
 * This client bypasses Row Level Security (RLS) for server-side admin operations
 * such as public widget lookups and webhook processing.
 *
 * NEVER expose this client or SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || url.includes('placeholder') || serviceRoleKey.includes('placeholder')) {
    throw new Error('Supabase admin client requires valid NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
