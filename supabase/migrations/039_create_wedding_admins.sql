-- Migration 037: Create wedding_admins table for per-wedding admin access control.
--
-- Replaces the global ADMIN_EMAILS env var with per-wedding admin assignments.
-- The env var is kept as a superadmin fallback during the transition.

CREATE TABLE IF NOT EXISTS wedding_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id    UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  clerk_user_id TEXT,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wedding_id, email)
);

CREATE INDEX IF NOT EXISTS idx_wedding_admins_wedding_id ON wedding_admins(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_admins_clerk_user_id ON wedding_admins(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_wedding_admins_email ON wedding_admins(email);

-- Enable RLS (service_role bypasses; no public policies needed)
ALTER TABLE wedding_admins ENABLE ROW LEVEL SECURITY;
