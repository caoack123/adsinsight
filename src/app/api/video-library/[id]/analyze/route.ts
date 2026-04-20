/**
 * POST /api/video-library/[id]/analyze
 * Triggers Gemini analysis for a saved video.
 *
 * API keys resolution order:
 *  1. Keys sent by the client in the request body (always correct — client
 *     context already merges localStorage + Supabase + admin injection)
 *  2. Supabase user_settings fallback (for non-browser callers like Shortcuts)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createServerClient } from '@/lib/supabase';
import { analyzeVideo } from '@/lib/video-analyzer';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.userId ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServerClient();

  // Fetch the video record
  const { data: video, error: fetchErr } = await db
    .from('video_library')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.analysis_status === 'done') return NextResponse.json({ analysis: video.analysis });

  // Parse request body (client sends keys from its settings context)
  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  // ── Resolve API keys: client-provided → Supabase DB → admin keys ─────────
  let googleAiApiKey = body.geminiApiKey ?? '';
  let geminiModel    = body.geminiModel  ?? 'gemini-2.5-flash';

  if (!googleAiApiKey) {
    // Fallback: look up from DB (used by iPhone Shortcuts or any non-browser caller)
    const { data: settingsRow } = await db
      .from('user_settings')
      .select('settings_json')
      .eq('user_id', userId)
      .single();

    const s = settingsRow?.settings_json as Record<string, string> | null ?? {};
    googleAiApiKey = s.googleAiApiKey ?? '';
    geminiModel    = s.videoAbcdModel ?? geminiModel;

    // If still empty and user is standard → fetch admin keys
    if (!googleAiApiKey) {
      const { data: profile } = await db
        .from('user_profiles').select('role').eq('id', userId).single();

      if (profile?.role === 'standard') {
        const { data: adminProfile } = await db
          .from('user_profiles').select('id').eq('role', 'admin').limit(1).single();
        if (adminProfile) {
          const { data: adminSettings } = await db
            .from('user_settings').select('settings_json').eq('user_id', adminProfile.id).single();
          const as = adminSettings?.settings_json as Record<string, string> | null ?? {};
          googleAiApiKey = as.googleAiApiKey ?? '';
          geminiModel    = as.videoAbcdModel ?? geminiModel;
        }
      }
    }
  }

  if (!googleAiApiKey) {
    await db.from('video_library').update({ analysis_status: 'error' }).eq('id', id);
    return NextResponse.json(
      { error: 'Google AI API key not found. Please save your settings on the Settings page.' },
      { status: 400 },
    );
  }

  // Mark as processing
  await db.from('video_library').update({ analysis_status: 'processing' }).eq('id', id);

  try {
    const analysis = await analyzeVideo({
      platform:      video.platform,
      url:           video.url,
      direct_url:    null,
      title:         video.title,
      author:        video.author,
      description:   video.description,
      view_count:    video.view_count,
      like_count:    video.like_count,
      comment_count: video.comment_count,
      geminiApiKey:  googleAiApiKey,
      geminiModel,
    });

    await db
      .from('video_library')
      .update({ analysis, analysis_status: 'done', analyzed_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ analysis });
  } catch (err) {
    await db.from('video_library').update({ analysis_status: 'error' }).eq('id', id);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
