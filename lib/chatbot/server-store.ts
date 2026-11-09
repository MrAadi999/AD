import { ChatbotConfig } from './types';
import { createAdminClient } from '../supabase/admin';

/**
 * Retrieve a chatbot configuration directly from Supabase Postgres.
 * Throws a clear Error if the database fails or the bot does not exist.
 */
export async function getServerChatbot(id: string): Promise<ChatbotConfig | null> {
  if (!id) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('chatbots')
    .select('*')
    .or(`id.eq.${id},public_id.eq.${id}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Database error: Failed to fetch chatbot "${id}": ${error.message}`);
  }

  return (data as ChatbotConfig) || null;
}

/**
 * Update a chatbot directly in Supabase Postgres.
 * Throws a clear Error if the database fails.
 */
export async function updateServerChatbot(
  id: string,
  updates: Partial<ChatbotConfig>
): Promise<ChatbotConfig> {
  if (!id) {
    throw new Error('Chatbot ID is required for update.');
  }

  const supabase = createAdminClient();
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('chatbots')
    .update(payload)
    .or(`id.eq.${id},public_id.eq.${id}`)
    .select()
    .single();

  if (error) {
    throw new Error(`Database error: Failed to update chatbot "${id}": ${error.message}`);
  }

  return data as ChatbotConfig;
}
