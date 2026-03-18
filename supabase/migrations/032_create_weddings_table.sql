-- Migration 032: Create weddings table (top-level multi-tenancy entity)
-- Safe to run multiple times (fully idempotent).

-- Create weddings table
CREATE TABLE IF NOT EXISTS weddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  couple_name TEXT NOT NULL,
  wedding_date DATE NOT NULL,
  rsvp_deadline TEXT,
  timezone    TEXT NOT NULL DEFAULT 'America/New_York',
  status      TEXT NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_weddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS weddings_updated_at ON weddings;
CREATE TRIGGER weddings_updated_at
  BEFORE UPDATE ON weddings
  FOR EACH ROW
  EXECUTE FUNCTION update_weddings_updated_at();

-- Index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_weddings_slug ON weddings(slug);

-- Enable RLS (app uses service_role which bypasses RLS; this blocks direct anon access)
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;

-- No public policies needed — weddings table is admin-only.
-- service_role handles all reads/writes.

-- Seed the default wedding (Helen & Enrique).
-- ON CONFLICT DO NOTHING makes this safe to re-run.
INSERT INTO weddings (slug, couple_name, wedding_date, rsvp_deadline, timezone, status)
VALUES (
  'helen-and-enrique',
  'Helen & Enrique',
  '2026-07-30',
  'March 30th, 2026',
  'America/New_York',
  'published'
)
ON CONFLICT (slug) DO NOTHING;
