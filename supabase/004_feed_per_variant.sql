-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Fix feed_products for per-variant storage
-- Changes unique constraint from item_group_id to item_id so each variant
-- gets its own row, while item_group_id holds the parent product ID.
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop old unique constraint (was on item_group_id)
ALTER TABLE feed_products DROP CONSTRAINT IF EXISTS feed_products_account_id_item_group_id_key;

-- 2. Ensure item_id is NOT NULL (fill any nulls with item_group_id as fallback)
UPDATE feed_products SET item_id = item_group_id WHERE item_id IS NULL OR item_id = '';

-- 3. Add unique constraint on (account_id, item_id)
ALTER TABLE feed_products ADD CONSTRAINT feed_products_account_id_item_id_key UNIQUE (account_id, item_id);

-- 4. Add index on item_group_id for grouping queries
CREATE INDEX IF NOT EXISTS feed_products_group_idx ON feed_products(account_id, item_group_id);
