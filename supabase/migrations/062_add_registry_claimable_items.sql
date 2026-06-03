-- Migration 062: Support claimable product items in the registry.
-- Adds an item type (fund vs product) plus product + claim fields. Existing
-- rows default to 'fund' and keep their cash-contribution behavior. A product
-- is "taken" when claimed_at is non-null.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registry_item_type') THEN
    CREATE TYPE registry_item_type AS ENUM ('fund', 'product');
  END IF;
END $$;

ALTER TABLE registry_items
  ADD COLUMN IF NOT EXISTS item_type registry_item_type NOT NULL DEFAULT 'fund',
  ADD COLUMN IF NOT EXISTS product_url TEXT,
  ADD COLUMN IF NOT EXISTS price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS claimed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS claimed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
