/**
 * POST /api/ingest
 *
 * Called by Google Ads Script to push account data into Supabase.
 * Auth: Bearer {script_token} from accounts table
 *
 * Body: { data_type: 'feed'|'changes'|'videos', records: [...] }
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountByToken,
  touchAccountSync,
  writeSyncLog,
  upsertFeedProducts,
  upsertChangeRecords,
  upsertVideoAds,
  upsertPerformanceDaily,
} from '@/lib/db';

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const account = await getAccountByToken(token);
  if (!account) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { data_type: string; records: Record<string, unknown>[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data_type, records } = body;
  if (!data_type || !Array.isArray(records)) {
    return NextResponse.json({ error: 'data_type and records[] required' }, { status: 400 });
  }

  // ── Upsert into Supabase ──────────────────────────────────────────────────
  let upserted = 0;
  try {
    if (data_type === 'feed') {
      upserted = await upsertFeedProducts(account.id, records);
    } else if (data_type === 'changes') {
      upserted = await upsertChangeRecords(account.id, records);
    } else if (data_type === 'videos') {
      upserted = await upsertVideoAds(account.id, records);
    } else if (data_type === 'performance') {
      upserted = await upsertPerformanceDaily(account.id, records);
    } else {
      return NextResponse.json({ error: `Unknown data_type: ${data_type}` }, { status: 400 });
    }

    await touchAccountSync(account.id);
    // Only log to sync_logs for the main data types (performance logs separately)
    if (['feed', 'changes', 'videos'].includes(data_type)) {
      await writeSyncLog({
        account_id: account.id,
        data_type: data_type as 'feed' | 'changes' | 'videos',
        records_upserted: upserted,
        status: 'success',
      });
    }

    return NextResponse.json({
      ok: true,
      account: account.account_name,
      data_type,
      records_upserted: upserted,
    });
  } catch (err) {
    if (['feed', 'changes', 'videos'].includes(data_type)) {
      await writeSyncLog({
        account_id: account.id,
        data_type: data_type as 'feed' | 'changes' | 'videos',
        records_upserted: 0,
        status: 'error',
        error_message: String(err),
      }).catch(() => {});
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
