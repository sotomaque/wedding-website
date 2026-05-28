-- Migration 055: Add design_config column to weddings table.
-- Stores per-wedding design overrides as JSONB (font pairing today; layout/
-- motif/etc. can be added later without a schema change). Defaulting to '{}'
-- and NOT NULL lets the resolve-on-read path treat missing keys as "use the
-- template's defaults" without needing a backfill — see
-- apps/web/lib/db/wedding-content-data.ts and apps/web/lib/validations/wedding-content.ts.

ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS design_config JSONB NOT NULL DEFAULT '{}'::jsonb;
