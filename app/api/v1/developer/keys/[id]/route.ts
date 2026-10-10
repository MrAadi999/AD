import { NextRequest, NextResponse } from 'next/server';
import { revokeApiKey } from '@/lib/developer/key-service';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const runtime = 'nodejs';

async function resolveWorkspaceId(req: NextRequest): Promise<string> {
  const url = new URL(req.url);
  const paramWs = url.searchParams.get('workspace_id');
  if (paramWs) return paramWs;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        if (member?.workspace_id) return member.workspace_id;
      }
    } catch {
      // Fallback
    }
  }

  return 'ws-demo-01';
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const keyId = params.id;
    const workspaceId = await resolveWorkspaceId(req);

    const revoked = await revokeApiKey(workspaceId, keyId);

    if (!revoked) {
      return NextResponse.json(
        { error: 'API key not found or already revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'API key revoked successfully' },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
