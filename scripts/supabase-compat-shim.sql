-- Supabase-compat shim for applying supabase/migrations/*.sql against a plain
-- Postgres (the CI migrations-apply-check + local scratch runs).
--
-- Supabase provisions a few objects that a vanilla `postgres` image does not.
-- Our migrations reference exactly three of them today:
--   * the anon / authenticated / service_role roles, and
--   * the auth.role() helper used inside a handful of RLS policies.
-- Create minimal stand-ins so the DDL applies. This file is intentionally
-- surface-minimal — extend it ONLY when a new migration references a new
-- Supabase-managed object (a failing apply-check will tell you exactly which).
--
-- Note: the apply-check validates that migrations APPLY, not RLS runtime
-- semantics — the app connects as the table owner / service_role and bypasses
-- RLS — so a constant-ish stub for auth.role() is sufficient.

DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- Mirrors Supabase's auth.role(): reads the role claim from the request JWT
-- (absent here, so it returns NULL) — enough for RLS policies that compare
-- against it to be created.
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE
  AS $fn$ SELECT current_setting('request.jwt.claim.role', true) $fn$;
