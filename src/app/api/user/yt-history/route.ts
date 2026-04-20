/**
 * GET  /api/user/yt-history         → list YouTube Intel history for logged-in user
 * POST /api/user/yt-history         → save a new history item
 * DELETE /api/user/yt-history?id=… → delete one item
 */
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  const session = await auth();
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();
  const { data } = await db
    .from('user_yt_history')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(25);

  return Response.json({ history: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db   = createServerClient();

  const { data, error } = await db
    .from('user_yt_history')
    .insert({
      user_id:      session.userId,
      query:        body.query,
      country_code: body.country_code,
      sort:         body.sort,
      output_lang:  body.output_lang,
      data:         body.data,
    })
    .select('id')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const db = createServerClient();
  await db
    .from('user_yt_history')
    .delete()
    .eq('id', id)
    .eq('user_id', session.userId); // ensure ownership

  return Response.json({ ok: true });
}
