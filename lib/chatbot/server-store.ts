import fs from 'fs';
import path from 'path';
import { ChatbotConfig } from './types';
import { inMemoryChatbots } from './service';

const CACHE_DIR = path.join(process.cwd(), '.next', 'knowledge_cache');
const CHATBOTS_FILE = path.join(CACHE_DIR, 'chatbots_store.json');

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch {}
  }
}

export function getChatbotsFromDisk(): ChatbotConfig[] {
  ensureDir();
  try {
    if (fs.existsSync(CHATBOTS_FILE)) {
      const raw = fs.readFileSync(CHATBOTS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export function saveChatbotsToDisk(bots: ChatbotConfig[]): void {
  ensureDir();
  try {
    fs.writeFileSync(CHATBOTS_FILE, JSON.stringify(bots, null, 2));
  } catch {}
}

export function getServerChatbot(id: string): ChatbotConfig | null {
  if (!id) return null;
  // Check memory first
  if (inMemoryChatbots.has(id)) {
    return inMemoryChatbots.get(id)!;
  }
  // Check disk
  const list = getChatbotsFromDisk();
  for (const b of list) {
    if (b && b.id) {
      inMemoryChatbots.set(b.id, b);
    }
  }
  return inMemoryChatbots.get(id) || null;
}

export function saveServerChatbot(bot: ChatbotConfig): void {
  if (!bot || !bot.id) return;
  inMemoryChatbots.set(bot.id, bot);
  const list = getChatbotsFromDisk().filter((b) => b && b.id !== bot.id);
  list.unshift(bot);
  saveChatbotsToDisk(list);
}

export function updateServerChatbot(id: string, updates: Partial<ChatbotConfig>): ChatbotConfig {
  const existing = getServerChatbot(id);
  const baseBot: ChatbotConfig = existing || {
    id,
    public_id: id,
    workspace_id: 'ws-demo-01',
    name: 'AI Assistant',
    assistant_name: 'AI Support',
    description: 'Customer support and business assistant.',
    industry: 'Technology',
    language: 'Hinglish',
    website_url: '',
    website_confirmed: false,
    welcome_message: 'Hi! 👋 How can I help you today?',
    tone: 'Friendly',
    response_style: 'Balanced',
    lead_collection_enabled: true,
    lead_fields: { name: true, email: true, phone: false },
    primary_cta: 'Contact us',
    secondary_cta: 'Explore services',
    avatar_type: 'default_icon',
    brand_color: '#2563EB',
    widget_enabled: true,
    allowed_domains: [],
    widget_position: 'bottom-right',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated: ChatbotConfig = {
    ...baseBot,
    ...updates,
    id,
    name: updates.name ?? baseBot.name,
    workspace_id: baseBot.workspace_id,
    industry: updates.industry ?? baseBot.industry,
    language: updates.language ?? baseBot.language,
    tone: updates.tone ?? baseBot.tone,
    response_style: updates.response_style ?? baseBot.response_style,
    primary_cta: updates.primary_cta ?? baseBot.primary_cta,
    secondary_cta: updates.secondary_cta ?? baseBot.secondary_cta,
    avatar_type: updates.avatar_type ?? baseBot.avatar_type,
    brand_color: updates.brand_color ?? baseBot.brand_color,
    lead_fields: updates.lead_fields ?? baseBot.lead_fields,
    updated_at: new Date().toISOString(),
  };

  saveServerChatbot(updated);
  return updated;
}
