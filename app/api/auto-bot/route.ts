import { NextRequest, NextResponse } from 'next/server';
import { autoGenerateBotFromUrl } from '@/lib/crawler/smart-analyzer';
import { saveKnowledgeChunks } from '@/lib/knowledge/vector-store';
import { inMemoryChatbots } from '@/lib/chatbot/service';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import * as crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, workspaceId = 'ws-default', chatbotName } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Website URL is required to auto-generate the bot.' },
        { status: 400 }
      );
    }

    const botId = `bot-${crypto.randomBytes(4).toString('hex')}`;
    const startTime = Date.now();

    // 1. Analyze and Reverse-Engineer the target website
    const analysis = await autoGenerateBotFromUrl({
      workspaceId,
      chatbotId: botId,
      targetUrl: url,
    });

    const finalName = chatbotName || analysis.brandName || 'AI Assistant';

    // 2. Build full chatbot configuration
    const chatbotConfig = {
      id: botId,
      public_id: botId,
      workspace_id: workspaceId,
      name: finalName,
      assistant_name: analysis.assistantName,
      description: analysis.description,
      industry: 'Technology' as const,
      language: 'Hinglish' as const,
      website_url: url,
      website_confirmed: true,
      welcome_message: analysis.welcomeMessage,
      tone: analysis.tone,
      response_style: 'Balanced' as const,
      lead_collection_enabled: true,
      lead_fields: { name: true, email: true, phone: true },
      primary_cta: 'Contact Us',
      secondary_cta: 'Explore Features',
      avatar_url: analysis.avatarUrl || '',
      avatar_type: 'default_icon' as const,
      brand_color: analysis.brandColor || '#2563EB',
      widget_enabled: true,
      allowed_domains: [],
      widget_position: 'bottom-right' as const,
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Save in-memory
    inMemoryChatbots.set(botId, chatbotConfig);

    // 4. Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createServerClient();
        await supabase.from('chatbots').insert(chatbotConfig);
      } catch (err: any) {
        console.warn('[AutoBot API] Supabase chatbot insert error:', err.message);
      }
    }

    // 5. Save seed knowledge chunks into vector store
    if (analysis.seedChunks.length > 0) {
      await saveKnowledgeChunks(workspaceId, botId, analysis.seedChunks);
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    // 6. Generate ready-to-use 1-line HTML embed snippet
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const embedSnippet = `<script\n  src="${baseUrl}/widget.js"\n  data-chatbot-id="${botId}"\n  data-theme-color="${chatbotConfig.brand_color}"\n  async>\n</script>`;

    return NextResponse.json({
      success: true,
      duration: `${durationSeconds}s`,
      chatbot: chatbotConfig,
      analysis: {
        brandName: analysis.brandName,
        pagesDiscovered: analysis.extractedPages.length,
        suggestedQuestions: analysis.suggestedQuestions,
        seedChunksCreated: analysis.seedChunks.length,
      },
      embedSnippet,
      testUrl: `${baseUrl}/chatbots/${botId}`,
      message: `🎉 Bot automatically generated and trained in ${durationSeconds} seconds!`,
    });
  } catch (err: any) {
    console.error('[AutoBot API] Generation failed:', err);
    return NextResponse.json(
      { error: err.message || 'Auto bot generation failed' },
      { status: 500 }
    );
  }
}
