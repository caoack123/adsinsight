import { NextRequest, NextResponse } from 'next/server';
import { getRecentSyncLogs } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const logs = await getRecentSyncLogs(id, 20);
    return NextResponse.json(logs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
