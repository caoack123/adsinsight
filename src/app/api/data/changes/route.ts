import { NextRequest, NextResponse } from 'next/server';
import { getChangeRecords } from '@/lib/db';
import changeDemoData from '@/data/change-tracker.json';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id') ?? 'demo';

  if (accountId === 'demo') {
    return NextResponse.json(changeDemoData);
  }

  try {
    const records = await getChangeRecords(accountId);
    return NextResponse.json({ changes: records });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
