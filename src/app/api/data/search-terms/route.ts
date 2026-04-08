import { NextRequest, NextResponse } from 'next/server';
import { getSearchTerms } from '@/lib/db';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    // Return empty for demo — no demo data for search terms
    return NextResponse.json({ terms: [], synced_at: null });
  }

  try {
    const terms = await getSearchTerms(accountId);
    const synced_at = terms[0]?.synced_at ?? null;
    return NextResponse.json({ terms, synced_at });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
