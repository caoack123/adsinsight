/**
 * GET  /api/user/token  — get current API token (or null)
 * POST /api/user/token  — generate / regenerate API token
 */
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function GET() {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();
  const { data } = await db
    .from('user_profiles')
    .select('api_token')
    .eq('id', session.userId)
    .single();

  return NextResponse.json({ token: data?.api_token ?? null });
}

export async function POST() {
  const session = await auth();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = randomUUID().replace(/-/g, '');   // 32-char hex
  const db = createServerClient();
  await db
    .from('user_profiles')
    .update({ api_token: token })
    .eq('id', session.userId);

  return NextResponse.json({ token });
}
