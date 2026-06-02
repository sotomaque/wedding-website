-- Migration 054: Add template_id column to weddings table.
-- Stores the ID of the selected template preset (e.g., "classic",
-- "elegant"). Null resolves to "classic" at render time, so existing
-- weddings render byte-identically without a backfill — see
-- apps/web/lib/templates.ts.

ALTER TABLE weddings ADD COLUMN IF NOT EXISTS template_id TEXT;
