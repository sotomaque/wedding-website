-- Migration 072: Enable RLS on email_logs (Supabase advisor: rls_disabled_in_public).
--
-- email_logs was added in 065_add_email_log.sql without enabling Row-Level
-- Security, so it is the lone table the Supabase "Table publicly accessible"
-- advisor flags on the production project. Every other table already has RLS
-- from 029_enable_rls_all_tables.sql / 042_rls_new_tables.sql.
--
-- Like the rest of the schema, the app only ever reaches email_logs through
-- Prisma over the service_role/owner connection, which BYPASSES RLS — and
-- email_logs is an admin-only audit table (sent-email history surfaced on the
-- admin Communications + guest history pages) with no public/anon read path.
-- There is also no Supabase anon-key client anywhere in the app. So enabling
-- RLS with NO policy fully closes the anon-key hole without affecting the app:
-- admin reads keep working (service_role bypass), anon/authenticated get
-- nothing. ALTER ... ENABLE is idempotent, so re-running is safe.

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
