-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Search Terms table
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_terms (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id        UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  search_term       TEXT NOT NULL,
  status            TEXT,
  campaign          TEXT DEFAULT '',
  ad_group          TEXT DEFAULT '',
  impressions       INTEGER DEFAULT 0,
  clicks            INTEGER DEFAULT 0,
  cost              NUMERIC DEFAULT 0,
  conversions       NUMERIC DEFAULT 0,
  conversions_value NUMERIC DEFAULT 0,
  ctr               NUMERIC DEFAULT 0,
  cvr               NUMERIC DEFAULT 0,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, search_term, campaign)
);

CREATE INDEX IF NOT EXISTS search_terms_account_id_idx ON search_terms(account_id);
CREATE INDEX IF NOT EXISTS search_terms_clicks_idx ON search_terms(account_id, clicks DESC);
