import { NextRequest, NextResponse } from 'next/server';
import { getFeedProducts } from '@/lib/db';
import feedDemoData from '@/data/feed-optimizer.json';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    return NextResponse.json(feedDemoData);
  }

  try {
    const products = await getFeedProducts(accountId);
    return NextResponse.json({
      account_name: '',
      exported_at: new Date().toISOString(),
      products,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
