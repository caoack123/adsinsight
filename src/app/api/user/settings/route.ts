/**
 * GET  /api/user/settings  → return saved settings for the logged-in user
 * PUT  /api/user/settings  → upsert settings for the logged-in user
 */
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const session = await auth();
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();
  const { data } = await db
    .from('user_settings')
    .select('settings_json')
    .eq('user_id', session.userId)
    .single();

  return Response.json({ settings: data?.settings_json ?? {} });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { settings } = await req.json();
  const db = createServerClient();

  await db.from('user_settings').upsert(
    { user_id: session.userId, settings_json: settings, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );

  return Response.json({ ok: true });
}
