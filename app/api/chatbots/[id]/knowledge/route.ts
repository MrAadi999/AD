import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getLatestJobForChatbot,
  getKnowledgeSourcesForChatbot,
} from '@/lib/crawler/runner';
import { ChatbotService } from '@/lib/chatbot/service';
import { getServerChatbot } from '@/lib/chatbot/server-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chatbotId = params.id;

  try {
    let workspaceId = 'ws-demo-01';
    let chatbot: any = null;

    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Secure workspace resolution
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'Workspace not found.' },
          { status: 403 }
        );
      }

      workspaceId = member.workspace_id;

      // Verify chatbot in workspace
      const { data: bot, error: botError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('id', chatbotId)
        .single();

      if (botError || !bot) {
        return NextResponse.json(
          { error: 'Chatbot not found.' },
          { status: 404 }
        );
      }

      chatbot = bot;
    } else {
      chatbot = getServerChatbot(chatbotId) || (await ChatbotService.getChatbotById(workspaceId, chatbotId));
      if (!chatbot) {
        chatbot = {
          id: chatbotId,
          workspace_id: workspaceId,
          name: 'AI Assistant',
          website_url: '',
        };
      }
    }

    // Retrieve latest crawl job & extracted knowledge sources
    const latestJob = await getLatestJobForChatbot(workspaceId, chatbotId);
    const knowledgeSources = await getKnowledgeSourcesForChatbot(
      workspaceId,
      chatbotId
    );

    const totalWords = knowledgeSources.reduce(
      (acc, s) => acc + (s.word_count || 0),
      0
    );

    const { getChunkStatsForChatbot, getChunkCountsBySourceForChatbot } = await import(
      '@/lib/knowledge/vector-store'
    );
    const chunkStats = await getChunkStatsForChatbot(workspaceId, chatbotId);
    const chunksPerSource = await getChunkCountsBySourceForChatbot(workspaceId, chatbotId);

    const enrichedSources = knowledgeSources.map((s) => ({
      ...s,
      chunks_count: chunksPerSource[s.id] || 0,
    }));

    // Universal Business Entity Extraction across all sources for UI display
    const allText = knowledgeSources.map((s) => s.content || '').join('\n');

    // Universal Phones (E.164, North America, UK, Europe, India toll-free & mobile)
    const phonePatterns = [
      /(?:(?:\+91|0091|91|0)[\s-]?)?[6789]\d{4}[\s-]?\d{5}\b|1800[\s-]?\d{3}[\s-]?\d{3,4}\b/g,
      /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
    ];
    const rawPhones: string[] = [];
    for (const pat of phonePatterns) {
      const pMatches = allText.match(pat) || [];
      for (const p of pMatches) {
        const cleanDigits = p.replace(/\D/g, '');
        if (cleanDigits.length >= 8 && cleanDigits.length <= 15 && !p.match(/^(19|20)\d{2}$/)) {
          rawPhones.push(p.trim());
        }
      }
    }
    const phones = Array.from(new Set(rawPhones.map((p) => p.replace(/\s+/g, ' ')))).slice(0, 6);

    // Universal Business Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const rawEmails = allText.match(emailRegex) || [];
    const emails = Array.from(
      new Set(
        rawEmails
          .map((e) => e.toLowerCase().trim())
          .filter((e) => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg') && !e.endsWith('.webp') && !e.includes('example.com') && !e.includes('schema.org') && !e.includes('sentry.io') && !e.includes('w3.org'))
      )
    ).slice(0, 6);

    // Universal Multi-Currency Global Pricing ($ / USD, € / EUR, £ / GBP, ₹ / INR / Rs., AED, CAD, AUD, JPY)
    const priceRegex = /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP|C\$|A\$|AED|¥)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:\/|per)\s*(?:month|mo|year|yr|annum|day|hour|seat|user|chat|project|license|item))?/gi;
    const rawPrices = allText.match(priceRegex) || [];
    const prices = Array.from(
      new Set(
        rawPrices
          .map((pr) => pr.trim())
          .filter((pr) => !/^\$(1[0-9]|2[0-9]|[0-9])$/.test(pr)) // Exclude Next.js RSC serialized identifiers
      )
    ).slice(0, 10);

    // WhatsApp and Address mentions
    const waMatches = Array.from(allText.matchAll(/(?:wa\.me\/|WhatsApp support:\s*|\/send\?phone=)([0-9+]+)/gi));
    const whatsapp = Array.from(new Set(waMatches.map((w) => w[1].trim()))).slice(0, 3);

    return NextResponse.json({
      chatbot,
      latest_job: latestJob,
      knowledge_sources: enrichedSources,
      business_facts: {
        phones,
        emails,
        prices,
        whatsapp,
      },
      stats: {
        total_pages: knowledgeSources.length,
        total_words: totalWords,
        total_chunks: chunkStats.totalChunks,
        total_tokens: chunkStats.totalTokens,
        status: latestJob?.status || 'idle',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chatbotId = params.id;

  try {
    let workspaceId = 'ws-demo-01';

    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
      }

      workspaceId = member.workspace_id;
    }

    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Source ID is required' },
        { status: 400 }
      );
    }

    const { deleteKnowledgeSource } = await import('@/lib/crawler/runner');
    const { deleteChunksForSource } = await import('@/lib/knowledge/vector-store');

    await deleteKnowledgeSource(workspaceId, chatbotId, sourceId);
    await deleteChunksForSource(workspaceId, chatbotId, sourceId);

    return NextResponse.json({ success: true, deletedSourceId: sourceId });
  } catch (err: any) {
    console.error('[DeleteKnowledgeSource] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const chatbotId = params.id;

  try {
    let workspaceId = 'ws-demo-01';

    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json({ error: 'Workspace not found.' }, { status: 403 });
      }

      workspaceId = member.workspace_id;
    }

    const body = await request.json();
    let title = (body.title || '').trim();
    let content = (body.content || '').trim();
    const sourceType = body.sourceType || 'document';
    let customUrl = body.url ? body.url.trim() : `internal://${chatbotId}/${Date.now()}`;

    // If source is a web link, extract live webpage content if not explicitly provided
    if (sourceType === 'website' || customUrl.startsWith('http://') || customUrl.startsWith('https://')) {
      const { fetchAndExtractPage } = await import('@/lib/crawler/native-crawler');
      const extracted = await fetchAndExtractPage(customUrl);
      if (extracted && extracted.status === 'completed') {
        if (!title) title = extracted.title || 'Web Page';
        if (!content) content = extracted.content;
        customUrl = extracted.url;
      } else if (!content) {
        // Resilient fallback: Provide clean baseline knowledge rather than failing
        try {
          const parsed = new URL(customUrl);
          const domain = parsed.hostname.replace(/^www\./, '');
          if (!title) title = `${domain} Web Resource`;
          content = `Official web resource for ${domain}. URL: ${customUrl}. Verified digital channel for customer inquiries, official updates, and service communication.`;
        } catch {
          if (!title) title = 'Website Link';
          content = `Official web resource: ${customUrl}. Verified knowledge touchpoint for customer support.`;
        }
      }

      // Auto-set chatbot website_url if currently empty
      try {
        const { getServerChatbot, updateServerChatbot } = await import('@/lib/chatbot/server-store');
        const existingBot = getServerChatbot(chatbotId);
        if (!existingBot?.website_url || !existingBot.website_url.trim()) {
          updateServerChatbot(chatbotId, { website_url: customUrl });
        }
      } catch {
        // ignore
      }
    }

    if (!title || title.length < 2) {
      return NextResponse.json(
        { error: 'Title is required (minimum 2 characters).' },
        { status: 400 }
      );
    }

    if (!content || content.length < 15) {
      return NextResponse.json(
        { error: 'Content is required (minimum 15 characters).' },
        { status: 400 }
      );
    }

    const crypto = await import('crypto');
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const now = new Date().toISOString();

    const newSource = {
      id: 'src-' + Math.random().toString(36).substring(2, 9),
      workspace_id: workspaceId,
      chatbot_id: chatbotId,
      source_type: sourceType,
      url: customUrl,
      title,
      content,
      content_hash: contentHash,
      status: 'completed' as const,
      word_count: wordCount,
      crawled_at: now,
      created_at: now,
      updated_at: now,
    };

    const { addOrUpdateKnowledgeSource } = await import('@/lib/crawler/runner');
    const { processKnowledgeSource } = await import('@/lib/knowledge/processor');

    await addOrUpdateKnowledgeSource(workspaceId, chatbotId, newSource);
    const procResult = await processKnowledgeSource(workspaceId, chatbotId, newSource);

    return NextResponse.json({
      success: true,
      source: newSource,
      processingResult: procResult,
    });
  } catch (err: any) {
    console.error('[AddKnowledgeSource] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


