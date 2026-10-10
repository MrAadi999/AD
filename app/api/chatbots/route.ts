import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { validateStep1, validateStep2, validateStep3 } from '@/lib/chatbot/validation';
import { ChatbotConfig } from '@/lib/chatbot/types';
import { getChatbotsFromDisk, saveServerChatbot } from '@/lib/chatbot/server-store';

export async function GET(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Securely fetch workspace membership for authenticated user
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'No workspace found for authenticated user.' },
          { status: 403 }
        );
      }

      // Query chatbots strictly for this workspace (RLS protected)
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('workspace_id', member.workspace_id)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: data || [] });
    } else {
      // Demo / offline fallback
      const url = new URL(request.url);
      const workspaceId = url.searchParams.get('workspace_id') || 'ws-demo-01';
      const diskBots = getChatbotsFromDisk();
      const filtered = diskBots.filter(
        (b) => b.workspace_id === workspaceId
      );
      return NextResponse.json({ data: filtered });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Server-side validation
    const v1 = validateStep1(body);
    if (!v1.isValid) {
      return NextResponse.json(
        { error: Object.values(v1.errors)[0] },
        { status: 400 }
      );
    }

    const v2 = validateStep2(body);
    if (!v2.isValid) {
      return NextResponse.json(
        { error: Object.values(v2.errors)[0] },
        { status: 400 }
      );
    }

    const v3 = validateStep3(body);
    if (!v3.isValid) {
      return NextResponse.json(
        { error: Object.values(v3.errors)[0] },
        { status: 400 }
      );
    }

    // 2. Multi-tenant authentication & secure workspace assignment
    let workspaceId = '';

    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Never trust client-provided workspace ID. Always look up the authenticated user's workspace.
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'No workspace membership found for this user.' },
          { status: 403 }
        );
      }

      workspaceId = member.workspace_id;

      // 3. Insert chatbot into Supabase
      const newChatbot = {
        workspace_id: workspaceId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        website_url: body.website_url.trim(),
        industry: body.industry,
        language: body.language,
        assistant_name: body.assistant_name?.trim() || body.name.trim(),
        welcome_message: body.welcome_message.trim(),
        tone: body.tone || 'Friendly',
        response_style: body.response_style || 'Balanced',
        lead_collection_enabled: Boolean(body.lead_collection_enabled),
        lead_fields: body.lead_fields || { name: true, email: true, phone: false },
        avatar_url: body.avatar_url || null,
        avatar_type: body.avatar_type || 'default_icon',
        brand_color: body.brand_color || '#2563EB',
        status: 'draft',
      };

      const { data, error } = await supabase
        .from('chatbots')
        .insert(newChatbot)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data }, { status: 201 });
    } else {
      // Demo / offline fallback mode
      workspaceId = body.workspace_id || 'ws-demo-01';

      const created: ChatbotConfig = {
        ...body,
        id: 'bot-' + Math.random().toString(36).substring(2, 9),
        workspace_id: workspaceId,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      saveServerChatbot(created);
      return NextResponse.json({ data: created }, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create chatbot.' },
      { status: 500 }
    );
  }
}
