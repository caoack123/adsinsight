import { NextRequest, NextResponse } from 'next/server';
import { getVideoAds, upsertVideoAds } from '@/lib/db';
import videoDemoData from '@/data/video-abcd.json';
import type { ABCDAnalysis } from '@/modules/video-abcd/schema';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    return NextResponse.json(videoDemoData);
  }

  try {
    const videos = await getVideoAds(accountId);
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
    // Save to video_ads with all relevant columns (thumbnail_url + abcd_analysis added via migration)
    await upsertVideoAds(account_id, [{
      video_id,
      youtube_url,
      ad_name: `[手动分析] ${video_id}`,
      thumbnail_url: `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`,
      abcd_analysis: analysis,
      performance: {},
      synced_at: new Date().toISOString(),
    }]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
