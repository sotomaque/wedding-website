-- Migration 071: Per-wedding dismissal flag for the admin onboarding checklist.
-- When true, the readiness checklist on /{slug}/admin is hidden for good. The
-- checklist's item completion is auto-detected from data and needs no storage;
-- only the dismissal is persisted.
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS onboarding_dismissed boolean NOT NULL DEFAULT false;
