import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side client (anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client (service role key, bypasses RLS — only use in API routes)
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// ─── Type definitions matching DB schema ──────────────────────────────────────

export interface DbAccount {
  id: string;
  customer_id: string;
  account_name: string;
  script_token: string;
  currency: string;
  timezone: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface DbSyncLog {
  id: string;
  account_id: string;
  data_type: 'feed' | 'changes' | 'videos';
  records_upserted: number;
  status: 'success' | 'error';
  error_message: string | null;
  synced_at: string;
}

export interface DbAiCache {
  id: string;
  account_id: string;
  entity_type: 'feed_product' | 'change_record' | 'video_ad';
  entity_id: string;
  model_used: string;
  result: Record<string, unknown>;
  created_at: string;
}

export interface DbFeedProduct {
  id: string;
  account_id: string;
  item_group_id: string;
  item_id: string | null;
  current_title: string;
  brand: string | null;
  product_type: string | null;
  price: number | null;
  currency: string;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversions_value: number;
  top_search_terms: string[];
  synced_at: string;
}

export interface DbChangeRecord {
  id: string;
  account_id: string;
  change_id: string;
  change_type: string;
  resource_type: string;
  resource_name: string;
  campaign: string;
  ad_group: string | null;
  changed_by: string | null;
  changed_at: string;
  old_value: string | null;
  new_value: string | null;
  performance_before: Record<string, unknown> | null;
  performance_after: Record<string, unknown> | null;
  synced_at: string;
}

export interface DbVideoAd {
  id: string;
  account_id: string;
  video_id: string;
  ad_name: string;
  youtube_url: string;
  format: string | null;
  duration_seconds: number | null;
  performance: Record<string, unknown>;
  synced_at: string;
}
