import { NextRequest, NextResponse } from 'next/server';
import { getVideoAds } from '@/lib/db';
import videoDemoData from '@/data/video-abcd.json';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    return NextResponse.json(videoDemoData);
  }

  try {
    const videos = await getVideoAds(accountId);
    return NextResponse.json({
      brand_name: '',
      branded_products: [],
      videos,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
