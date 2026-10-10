import * as crypto from 'crypto';
import { createClient as createServerClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase/client';
import { ChatbotConfig } from '../chatbot/types';
import { inMemoryChatbots } from '../chatbot/service';

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
 * Generate a safe, human-readable public bot identifier (e.g., bs_bot_a1b2c3d4e5f6)
 */
export function generatePublicBotId(): string {
  const hex = crypto.randomBytes(6).toString('hex');
  return `bs_bot_${hex}`;
}

/**
 * Retrieve full chatbot by public_id (or internal id fallback)
 * Never exposes this object directly to public API clients.
 */
export async function getChatbotByPublicId(
  publicIdOrId: string
): Promise<ChatbotConfig | null> {
  if (!publicIdOrId) return null;

  // 1. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      // Search by public_id first, then fallback to id
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .or(`public_id.eq.${publicIdOrId},id.eq.${publicIdOrId}`)
        .limit(1)
        .single();

      if (!error && data) {
        // If bot didn't have public_id yet, generate and save it
        if (!data.public_id) {
          const generated = generatePublicBotId();
          await supabase
            .from('chatbots')
            .update({ public_id: generated })
            .eq('id', data.id);
          data.public_id = generated;
        }
        return data as ChatbotConfig;
      }
    } catch {
      // fallback
    }
  }

  // 2. In-memory / demo fallback
  const allBots = Array.from(inMemoryChatbots.values());
  let found = allBots.find(
    (b) => b.public_id === publicIdOrId || b.id === publicIdOrId
  );

  // If found in memory without public_id, assign one
  if (found && !found.public_id) {
    found.public_id = generatePublicBotId();
    inMemoryChatbots.set(found.id || 'bot-default', found);
  }

  return found || null;
}

/**
 * Get sanitized public-safe configuration for the widget frontend
 * Strictly filters out all private workspace data, database IDs, and secrets.
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
