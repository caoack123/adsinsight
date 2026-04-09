-- Migration 005: Add metrics_by_range JSONB to feed_products
-- Stores performance metrics for multiple date windows (7d/14d/30d/90d/180d/365d)
ALTER TABLE feed_products ADD COLUMN IF NOT EXISTS metrics_by_range JSONB DEFAULT '{}';
