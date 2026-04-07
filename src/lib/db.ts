/**
 * Data access layer — thin wrappers around Supabase for each entity type.
 * All functions use the service-role client (server-side only).
 */
import { createServerClient, type DbAccount, type DbSyncLog, type DbAiCache } from './supabase';

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<DbAccount[]> {
  const db = createServerClient();
  const { data, error } = await db
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAccountByToken(token: string): Promise<DbAccount | null> {
  const db = createServerClient();
  const { data, error } = await db
    .from('accounts')
    .select('*')
    .eq('script_token', token)
    .single();
  if (error) return null;
  return data;
}

export async function createAccount(params: {
  customer_id: string;
  account_name: string;
  currency?: string;
  timezone?: string;
}): Promise<DbAccount> {
  const db = createServerClient();
  const { data, error } = await db
    .from('accounts')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id: string): Promise<void> {
  const db = createServerClient();
  const { error } = await db.from('accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function touchAccountSync(id: string): Promise<void> {
  const db = createServerClient();
  await db
    .from('accounts')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', id);
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

export async function getRecentSyncLogs(accountId: string, limit = 10): Promise<DbSyncLog[]> {
  const db = createServerClient();
  const { data, error } = await db
    .from('sync_logs')
    .select('*')
    .eq('account_id', accountId)
    .order('synced_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function writeSyncLog(params: {
  account_id: string;
  data_type: 'feed' | 'changes' | 'videos';
  records_upserted: number;
  status: 'success' | 'error';
  error_message?: string;
}): Promise<void> {
  const db = createServerClient();
  await db.from('sync_logs').insert(params);
}

// ─── AI Analysis Cache ────────────────────────────────────────────────────────

export async function getAiCache(params: {
  account_id: string;
  entity_type: 'feed_product' | 'change_record' | 'video_ad';
  entity_id: string;
}): Promise<DbAiCache | null> {
  const db = createServerClient();
  const { data, error } = await db
    .from('ai_analysis_cache')
    .select('*')
    .eq('account_id', params.account_id)
    .eq('entity_type', params.entity_type)
    .eq('entity_id', params.entity_id)
    .single();
  if (error) return null;
  return data;
}

export async function upsertAiCache(params: {
  account_id: string;
  entity_type: 'feed_product' | 'change_record' | 'video_ad';
  entity_id: string;
  model_used: string;
  result: Record<string, unknown>;
}): Promise<void> {
  const db = createServerClient();
  await db.from('ai_analysis_cache').upsert(
    { ...params, created_at: new Date().toISOString() },
    { onConflict: 'account_id,entity_type,entity_id' }
  );
}

// ─── Feed Products ────────────────────────────────────────────────────────────

export async function upsertFeedProducts(
  accountId: string,
  products: Array<Record<string, unknown>>
): Promise<number> {
  const db = createServerClient();
  const rows = products.map(p => ({ ...p, account_id: accountId }));
  const { data, error } = await db
    .from('feed_products')
    .upsert(rows, { onConflict: 'account_id,item_group_id' })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function getFeedProducts(accountId: string) {
  const db = createServerClient();
  const { data, error } = await db
    .from('feed_products')
    .select('*')
    .eq('account_id', accountId)
    .order('impressions', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Change Records ───────────────────────────────────────────────────────────

export async function upsertChangeRecords(
  accountId: string,
  records: Array<Record<string, unknown>>
): Promise<number> {
  const db = createServerClient();
  const rows = records.map(r => ({ ...r, account_id: accountId }));
  const { data, error } = await db
    .from('change_records')
    .upsert(rows, { onConflict: 'account_id,change_id' })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function getChangeRecords(accountId: string) {
  const db = createServerClient();
  const { data, error } = await db
    .from('change_records')
    .select('*')
    .eq('account_id', accountId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Video Ads ────────────────────────────────────────────────────────────────

export async function upsertVideoAds(
  accountId: string,
  videos: Array<Record<string, unknown>>
): Promise<number> {
  const db = createServerClient();
  const rows = videos.map(v => ({ ...v, account_id: accountId }));
  const { data, error } = await db
    .from('video_ads')
    .upsert(rows, { onConflict: 'account_id,video_id' })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

// ─── Performance Daily ────────────────────────────────────────────────────────

export async function upsertPerformanceDaily(
  accountId: string,
  records: Array<Record<string, unknown>>
): Promise<number> {
  const db = createServerClient();
  const rows = records.map(r => ({ ...r, account_id: accountId }));
  const { data, error } = await db
    .from('performance_daily')
    .upsert(rows, { onConflict: 'account_id,date,campaign_name' })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function getPerformanceDaily(accountId: string, startDate: string) {
  const db = createServerClient();
  const { data, error } = await db
    .from('performance_daily')
    .select('*')
    .eq('account_id', accountId)
    .gte('date', startDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getVideoAds(accountId: string) {
  const db = createServerClient();
  const { data, error } = await db
    .from('video_ads')
    .select('*')
    .eq('account_id', accountId)
    .order('synced_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
