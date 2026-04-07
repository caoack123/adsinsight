-- Migration: add performance_daily table for account-level daily metrics
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/iwzwggfsjedcqtarllaj/sql

CREATE TABLE IF NOT EXISTS performance_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date            date NOT NULL,
  campaign_name   text NOT NULL DEFAULT '',
  impressions     bigint DEFAULT 0,
  clicks          bigint DEFAULT 0,
  cost            numeric(12,4) DEFAULT 0,
  conversions     numeric(10,2) DEFAULT 0,
  conversions_value numeric(12,2) DEFAULT 0,
  ctr             numeric(8,6) DEFAULT 0,
  average_cpc     numeric(10,4) DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(account_id, date, campaign_name)
);

CREATE INDEX IF NOT EXISTS performance_daily_account_date
  ON performance_daily(account_id, date DESC);

-- Disable RLS (same as other tables)
ALTER TABLE performance_daily DISABLE ROW LEVEL SECURITY;
