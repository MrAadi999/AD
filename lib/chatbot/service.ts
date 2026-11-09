import { createClient, isSupabaseConfigured } from '../supabase/client';
import { ChatbotConfig } from './types';

export const ChatbotService = {
  /**
   * Get all chatbots for a given workspace strictly from Supabase Postgres.
   * Throws a clear error if the database query fails.
   */
  async getChatbots(workspaceId: string): Promise<ChatbotConfig[]> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required to fetch chatbots.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase database is not configured. Please check your Supabase environment variables.');
    }

    // If in browser context, use API route for secure workspace verification
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/chatbots`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `Database query failed (${res.status})`);
      }
      return json.data || [];
    }

    // Direct server/client Supabase query
    const supabase = createClient();
    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: Failed to fetch chatbots for workspace "${workspaceId}": ${error.message}`);
    }

    return (data as ChatbotConfig[]) || [];
  },

  /**
   * Get a single chatbot by ID strictly from Supabase Postgres.
   * Returns null if not found, or throws an Error if the query fails.
   */
  async getChatbotById(workspaceId: string, id: string): Promise<ChatbotConfig | null> {
    if (!id || !workspaceId) {
      throw new Error('Both workspaceId and chatbot id are required.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase database is not configured. Please check your Supabase environment variables.');
    }

    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/chatbots/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (res.status === 404) return null;
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `Database query failed (${res.status})`);
      }
      return json.data as ChatbotConfig;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Database error: Failed to fetch chatbot "${id}": ${error.message}`);
    }

    return (data as ChatbotConfig) || null;
  },

  /**
   * Create a new chatbot under the user's workspace in Supabase.
   */
  async createChatbot(
    workspaceId: string,
    config: Omit<ChatbotConfig, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<{ data?: ChatbotConfig; error?: string }> {
    if (!workspaceId) {
      return { error: 'No active workspace found. Please log in again.' };
    }

    if (!isSupabaseConfigured()) {
      return { error: 'Supabase database is not configured. Postgres connection is required.' };
    }

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/chatbots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...config, workspace_id: workspaceId }),
        });

        const json = await res.json();
        if (!res.ok || json.error) {
          return { error: json.error || `Failed to create chatbot (${res.status}).` };
        }
        return { data: json.data };
      } catch (e: any) {
        return { error: `Network error connecting to database API: ${e.message}` };
      }
    }

    const supabase = createClient();
    const newBotPayload = {
      ...config,
      workspace_id: workspaceId,
      status: 'draft',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('chatbots')
      .insert(newBotPayload)
      .select()
      .single();

    if (error) {
      return { error: `Database error: Failed to create chatbot: ${error.message}` };
    }

    return { data: data as ChatbotConfig };
  },

  /**
   * Update an existing chatbot in Supabase.
   */
  async updateChatbot(
    workspaceId: string,
    id: string,
    updates: Partial<ChatbotConfig>
  ): Promise<{ data?: ChatbotConfig; error?: string }> {
    if (!workspaceId || !id) {
      return { error: 'Missing workspace or bot ID' };
    }

    if (!isSupabaseConfigured()) {
      return { error: 'Supabase database is not configured. Postgres connection is required.' };
    }

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/chatbots/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const json = await res.json();
        if (!res.ok || json.error) {
          return { error: json.error || `Failed to update chatbot (${res.status}).` };
        }
        return { data: json.data };
      } catch (e: any) {
        return { error: `Network error connecting to database API: ${e.message}` };
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('chatbots')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { error: `Database error: Failed to update chatbot: ${error.message}` };
    }

    return { data: data as ChatbotConfig };
  },

  /**
   * Delete a chatbot from Supabase.
   */
  async deleteChatbot(workspaceId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (!workspaceId || !id) {
      return { success: false, error: 'Missing workspace or bot ID' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase database is not configured. Postgres connection is required.' };
    }

    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/chatbots/${id}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          return { success: false, error: json.error || `Failed to delete chatbot (${res.status}).` };
        }
        return { success: true };
      } catch (e: any) {
        return { success: false, error: `Network error connecting to database API: ${e.message}` };
      }
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('chatbots')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', id);

    if (error) {
      return { success: false, error: `Database error: Failed to delete chatbot: ${error.message}` };
    }

    return { success: true };
  },
};
