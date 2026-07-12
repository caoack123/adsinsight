import { NextRequest, NextResponse } from 'next/server';
import { getVideoAds, getAccountById, saveVideoAbcdAnalysis } from '@/lib/db';
import videoDemoData from '@/data/video-abcd.json';
import type { ABCDAnalysis } from '@/modules/video-abcd/schema';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    return NextResponse.json(videoDemoData);
  }

  try {
    const [videos, account] = await Promise.all([
      getVideoAds(accountId),
      getAccountById(accountId),
    ]);
    return NextResponse.json({ brand_name: account?.account_name ?? '', branded_products: [], videos });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Save an ABCD analysis result (from the manual URL analyzer, or a synced video's detail page) to the DB
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
    await saveVideoAbcdAnalysis({ account_id, video_id, youtube_url, analysis });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
