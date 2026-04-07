import { NextRequest, NextResponse } from 'next/server';
import { getVideoAds, upsertVideoAds, upsertAiCache } from '@/lib/db';
import { createServerClient } from '@/lib/supabase';
import videoDemoData from '@/data/video-abcd.json';
import type { ABCDAnalysis } from '@/modules/video-abcd/schema';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    return NextResponse.json(videoDemoData);
  }

  try {
    const videos = await getVideoAds(accountId);

    // Attach abcd_analysis from ai_analysis_cache for any video that has one
    if (videos.length > 0) {
      const db = createServerClient();
      const { data: cacheRows } = await db
        .from('ai_analysis_cache')
        .select('entity_id, result')
        .eq('account_id', accountId)
        .eq('entity_type', 'video_ad');
      if (cacheRows && cacheRows.length > 0) {
        const cacheMap = Object.fromEntries(cacheRows.map(r => [r.entity_id, r.result]));
        for (const v of videos) {
          if (!v.abcd_analysis && cacheMap[v.video_id]) {
            v.abcd_analysis = cacheMap[v.video_id];
          }
        }
      }
    }

    return NextResponse.json({ brand_name: '', branded_products: [], videos });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Save a manually analyzed video (from the URL analyzer) to the DB
export async function POST(request: NextRequest) {
  let body: { account_id: string; video_id: string; youtube_url: string; analysis: ABCDAnalysis };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { account_id, video_id, youtube_url, analysis } = body;
  if (!account_id || !video_id || !analysis) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (account_id === 'demo') {
    return NextResponse.json({ error: 'Cannot save to demo account' }, { status: 400 });
  }

  try {
    // Insert minimal row into video_ads (only columns that exist in schema)
    await upsertVideoAds(account_id, [{
      video_id,
      youtube_url,
      ad_name: `[手动分析] ${video_id}`,
      performance: {},
      synced_at: new Date().toISOString(),
    }]);

    // Save analysis to ai_analysis_cache (has abcd_analysis as JSONB result)
    await upsertAiCache({
      account_id,
      entity_type: 'video_ad',
      entity_id: video_id,
      model_used: analysis.model ?? 'gemini',
      result: analysis as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
