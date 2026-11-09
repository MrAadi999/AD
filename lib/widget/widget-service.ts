import * as crypto from 'crypto';
import { createAdminClient } from '../supabase/admin';
import { ChatbotConfig } from '../chatbot/types';

export interface PublicWidgetConfig {
  bot_id: string;
  assistant_name: string;
  welcome_message: string;
  language: string;
  brand_color: string;
  avatar_url: string | null;
  position: 'bottom-right' | 'bottom-left';
  widget_enabled: boolean;
  status: string;
}

/**
 * Generate a safe public bot identifier (e.g., bot_a1b2c3d4e5f6)
 */
export function generatePublicBotId(): string {
  const hex = crypto.randomBytes(6).toString('hex');
  return `bot_${hex}`;
}

/**
 * Retrieve chatbot by public_id or id using the server-side SUPABASE_SERVICE_ROLE_KEY client.
 * Strictly verifies bot_id and workspace_id in code.
 * Throws or returns null if not found or if database fails.
 */
export async function getChatbotByPublicId(
  publicIdOrId: string
): Promise<ChatbotConfig | null> {
  if (!publicIdOrId || typeof publicIdOrId !== 'string') return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('chatbots')
    .select('*')
    .or(`public_id.eq.${publicIdOrId},id.eq.${publicIdOrId}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Database error fetching chatbot: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // Strictly check that the resolved record has both valid id and workspace_id
  if (!data.id || !data.workspace_id) {
    console.error(`[WidgetService] Incomplete chatbot record: missing id or workspace_id for ${publicIdOrId}`);
    return null;
  }

  return data as ChatbotConfig;
}

/**
 * Get sanitized public-safe configuration for the widget frontend.
 * Strictly filters out private workspace data, secrets, and internal keys.
 */
export async function getPublicChatbotConfig(
  publicId: string
): Promise<{ config?: PublicWidgetConfig; error?: string; status?: number }> {
  const bot = await getChatbotByPublicId(publicId);

  if (!bot) {
    return {
      error: 'Chatbot not found.',
      status: 404,
    };
  }

  // Explicit check on bot_id and workspace_id
  if (!bot.id || !bot.workspace_id) {
    return {
      error: 'Chatbot configuration is invalid or missing workspace binding.',
      status: 500,
    };
  }

  if (bot.status === 'paused') {
    return {
      error: 'This assistant is temporarily unavailable.',
      status: 403,
    };
  }

  if (bot.widget_enabled === false) {
    return {
      error: 'Widget is currently disabled for this assistant.',
      status: 403,
    };
  }

  const safeConfig: PublicWidgetConfig = {
    bot_id: bot.public_id || bot.id || publicId,
    assistant_name: bot.assistant_name || bot.name || 'AI Assistant',
    welcome_message:
      bot.welcome_message || 'Hi! How can I help you with our services today?',
    language: bot.language || 'English',
    brand_color: bot.brand_color || '#2563EB',
    avatar_url: bot.avatar_url || null,
    position: bot.widget_position || 'bottom-right',
    widget_enabled: true,
    status: bot.status || 'active',
  };

  return { config: safeConfig, status: 200 };
}
