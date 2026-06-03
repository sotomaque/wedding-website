-- Migration 056: Add headcount_config column to weddings table.
-- Stores admin-defined criteria for which guests count toward the dashboard's
-- RSVP headcount stat as JSONB (included lists, exclude 3-and-under, exclude
-- under-21, custom card label). Defaulting to '{}' and NOT NULL lets the
-- resolve-on-read path treat missing keys as "count every accepted guest" —
-- the historical behavior — without needing a backfill. See
-- apps/web/lib/headcount.ts and apps/web/lib/validations/wedding-content.ts.

ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS headcount_config JSONB NOT NULL DEFAULT '{}'::jsonb;
