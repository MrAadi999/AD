import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { validateUrl } from '@/lib/chatbot/validation';
import { ChatbotService } from '@/lib/chatbot/service';
import { getServerChatbot, updateServerChatbot } from '@/lib/chatbot/server-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const botId = params.id;

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

      // Fetch user's workspace
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

      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('workspace_id', member.workspace_id)
        .eq('id', botId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Chatbot not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data });
    } else {
      // Offline / in-memory demo mode: retrieve or auto-register from server store
      let bot = getServerChatbot(botId);
      if (!bot) {
        bot = await ChatbotService.getChatbotById('ws-demo-01', botId);
      }
      if (!bot) {
        return NextResponse.json({ error: 'Chatbot not found.' }, { status: 404 });
      }
      return NextResponse.json({ data: bot });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const botId = params.id;

  try {
    const body = await request.json();

    // Validate fields if provided
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2)) {
      return NextResponse.json(
        { error: 'Bot name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (body.website_url !== undefined) {
      const urlCheck = validateUrl(body.website_url);
      if (!urlCheck.isValid) {
        return NextResponse.json({ error: urlCheck.error }, { status: 400 });
      }
    }

    if (body.brand_color !== undefined && !/^#([0-9A-Fa-f]{3}){1,2}$/.test(body.brand_color)) {
      return NextResponse.json(
        { error: 'Invalid brand color hex code.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Securely fetch user workspace
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

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (body.name !== undefined) updates.name = body.name.trim();
      if (body.description !== undefined) updates.description = body.description?.trim() || null;
      if (body.website_url !== undefined) updates.website_url = body.website_url.trim();
      if (body.industry !== undefined) updates.industry = body.industry;
      if (body.language !== undefined) updates.language = body.language;
      if (body.assistant_name !== undefined) updates.assistant_name = body.assistant_name?.trim();
      if (body.welcome_message !== undefined) updates.welcome_message = body.welcome_message.trim();
      if (body.tone !== undefined) updates.tone = body.tone;
      if (body.response_style !== undefined) updates.response_style = body.response_style;
      if (body.lead_collection_enabled !== undefined)
        updates.lead_collection_enabled = Boolean(body.lead_collection_enabled);
      if (body.lead_fields !== undefined) updates.lead_fields = body.lead_fields;
      if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
      if (body.avatar_type !== undefined) updates.avatar_type = body.avatar_type;
      if (body.brand_color !== undefined) updates.brand_color = body.brand_color;
      if (body.status !== undefined) updates.status = body.status;

      const { data, error } = await supabase
        .from('chatbots')
        .update(updates)
        .eq('workspace_id', member.workspace_id)
        .eq('id', botId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    } else {
      const updated = updateServerChatbot(botId, body);
      return NextResponse.json({ data: updated });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update chatbot.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const botId = params.id;

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

      // Check workspace membership and role (owner or admin required for deletion)
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !member) {
        return NextResponse.json(
          { error: 'Workspace not found.' },
          { status: 403 }
        );
      }

      if (member.role !== 'owner' && member.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only workspace owners and admins can delete chatbots.' },
          { status: 403 }
        );
      }

      const { error } = await supabase
        .from('chatbots')
        .delete()
        .eq('workspace_id', member.workspace_id)
        .eq('id', botId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to delete chatbot.' },
      { status: 500 }
    );
  }
}
