/**
 * GET  /api/video-library          — list videos for the current user
 * POST /api/video-library          — ingest a new URL
 *
 * Auth: session cookie (web) OR X-API-Token header (iPhone Shortcuts)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';
import { scrapeVideoMeta } from '@/lib/video-scraper';

// ── Helper: resolve userId from session or API token ─────────────────────────
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1. Try session
  const session = await auth();
  if (session?.userId) return session.userId;

  // 2. Try X-API-Token header
  const token = req.headers.get('x-api-token');
  if (token) {
    const db = createServerClient();
    const { data } = await db
      .from('user_profiles')
      .select('id')
      .eq('api_token', token)
      .single();
    return data?.id ?? null;
  }

  return null;
}

// ── GET /api/video-library ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();
  const platform = req.nextUrl.searchParams.get('platform');
  const status   = req.nextUrl.searchParams.get('status');

  let q = db
    .from('video_library')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
    .limit(200);

  if (platform) q = q.eq('platform', platform);
  if (status)   q = q.eq('analysis_status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// ── POST /api/video-library ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const url: string = (body.url ?? '').trim();
  const note: string | undefined = body.note;

  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

  // Fetch user's API keys from settings
  const db = createServerClient();
  const { data: settingsRow } = await db
    .from('user_settings')
    .select('settings_json')
    .eq('user_id', userId)
    .single();

  const settings = settingsRow?.settings_json as Record<string, string> | null ?? {};
  // Also check admin keys if user is standard
  const { data: profile } = await db
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  let youtubeApiKey = settings.youtubeApiKey ?? '';
  let googleAiApiKey = settings.googleAiApiKey ?? '';

  if (profile?.role === 'standard') {
    const { data: adminProfile } = await db
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    if (adminProfile) {
      const { data: adminSettings } = await db
        .from('user_settings')
        .select('settings_json')
        .eq('user_id', adminProfile.id)
        .single();
      const as = adminSettings?.settings_json as Record<string, string> | null ?? {};
      youtubeApiKey  = as.youtubeApiKey  ?? youtubeApiKey;
      googleAiApiKey = as.googleAiApiKey ?? googleAiApiKey;
    }
  }

  // Scrape metadata (fast — no video download)
  const apifyToken = process.env.APIFY_API_TOKEN ?? '';
  const meta = await scrapeVideoMeta(url, { youtubeApiKey, apifyToken }).catch(() => null);

  // Save to DB
  const { data: row, error } = await db
    .from('video_library')
    .insert({
      user_id:       userId,
      url,
      note:          note ?? null,
      platform:      meta?.platform      ?? 'other',
      platform_id:   meta?.platform_id   ?? null,
      title:         meta?.title         ?? null,
      author:        meta?.author        ?? null,
      thumbnail_url: meta?.thumbnail_url ?? null,
      duration_sec:  meta?.duration_sec  ?? null,
      view_count:    meta?.view_count    ?? null,
      like_count:    meta?.like_count    ?? null,
      comment_count: meta?.comment_count ?? null,
      share_count:   meta?.share_count   ?? null,
      description:   meta?.description   ?? null,
      analysis_status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message ?? String(error) }, { status: 500 });
  return NextResponse.json(row, { status: 201 });
}
