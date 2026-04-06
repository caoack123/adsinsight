-- ─────────────────────────────────────────────────────────────────────────────
-- AdInsight AI — Supabase Schema
-- Run this entire file in Supabase SQL Editor (once)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     TEXT UNIQUE NOT NULL,          -- Google Ads Customer ID (no dashes)
  account_name    TEXT NOT NULL,
  script_token    TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  currency        TEXT DEFAULT 'USD',
  timezone        TEXT DEFAULT 'America/New_York',
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Feed Products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_products (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id          UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  item_group_id       TEXT NOT NULL,
  item_id             TEXT,
  current_title       TEXT NOT NULL,
  brand               TEXT,
  product_type        TEXT,
  price               NUMERIC,
  currency            TEXT DEFAULT 'USD',
  impressions         INTEGER DEFAULT 0,
  clicks              INTEGER DEFAULT 0,
  ctr                 NUMERIC DEFAULT 0,
  cost                NUMERIC DEFAULT 0,
  conversions         NUMERIC DEFAULT 0,
  conversions_value   NUMERIC DEFAULT 0,
  top_search_terms    JSONB DEFAULT '[]',
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, item_group_id)
);

-- ─── 3. Change Records ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_records (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id          UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  change_id           TEXT NOT NULL,
  change_type         TEXT NOT NULL,
  resource_type       TEXT NOT NULL,
  resource_name       TEXT NOT NULL,
  campaign            TEXT NOT NULL,
  ad_group            TEXT,
  changed_by          TEXT,
  changed_at          TIMESTAMPTZ NOT NULL,
  old_value           TEXT,
  new_value           TEXT,
  performance_before  JSONB,
  performance_after   JSONB,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, change_id)
);

-- ─── 4. Video Ads ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_ads (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id        UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  video_id          TEXT NOT NULL,
  ad_name           TEXT NOT NULL,
  youtube_url       TEXT NOT NULL,
  format            TEXT,
  duration_seconds  INTEGER,
  performance       JSONB DEFAULT '{}',
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, video_id)
);

-- ─── 5. AI Analysis Cache ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id   UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  entity_type  TEXT NOT NULL,  -- 'feed_product' | 'change_record' | 'video_ad'
  entity_id    TEXT NOT NULL,  -- item_group_id | change_id | video_id
  model_used   TEXT NOT NULL,
  result       JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, entity_type, entity_id)
);

-- ─── 6. Sync Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id        UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  data_type         TEXT NOT NULL,       -- 'feed' | 'changes' | 'videos'
  records_upserted  INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'success',
  error_message     TEXT,
  synced_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feed_products_account     ON feed_products(account_id);
CREATE INDEX IF NOT EXISTS idx_change_records_account    ON change_records(account_id);
CREATE INDEX IF NOT EXISTS idx_change_records_changed_at ON change_records(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_ads_account         ON video_ads(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup           ON ai_analysis_cache(account_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_account         ON sync_logs(account_id, synced_at DESC);

-- ─── Disable RLS (server uses service role key) ───────────────────────────────
ALTER TABLE accounts           DISABLE ROW LEVEL SECURITY;
ALTER TABLE feed_products      DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_records     DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_ads          DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache  DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs          DISABLE ROW LEVEL SECURITY;
