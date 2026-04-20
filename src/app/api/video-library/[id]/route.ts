/**
 * GET    /api/video-library/[id]          — fetch single video
 * PATCH  /api/video-library/[id]          — update note
 * DELETE /api/video-library/[id]          — delete video
 * POST   /api/video-library/[id]/analyze  — trigger Gemini analysis
 *   (analyze is handled in the nested route file below)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';

async function getOwnerUserId(req: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.userId) return session.userId;

  const token = req.headers.get('x-api-token');
  if (token) {
    const db = createServerClient();
    const { data } = await db.from('user_profiles').select('id').eq('api_token', token).single();
    return data?.id ?? null;
  }
  return null;
}

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await getOwnerUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();
  const { data, error } = await db
    .from('video_library')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await getOwnerUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = createServerClient();
  const { data, error } = await db
    .from('video_library')
    .update({ note: body.note ?? null })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const userId = await getOwnerUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();
  const { error } = await db
    .from('video_library')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
