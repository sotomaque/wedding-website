-- Migration 065: Email communication log.
--
-- Append-only audit trail of every outbound email so the admin can see who has
-- been contacted and when. `type` is free text (mirrors email_template_type
-- values where applicable, plus "custom") so ad-hoc sends fit too. guest_id is
-- nullable — couple/admin notifications aren't tied to a single guest.

CREATE TABLE IF NOT EXISTS email_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id          UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id            UUID REFERENCES guests(id) ON DELETE CASCADE,
  recipient_email     TEXT NOT NULL,
  type                TEXT NOT NULL,
  subject             TEXT,
  status              TEXT NOT NULL DEFAULT 'sent',
  provider_message_id TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_guest_created
  ON email_logs (guest_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_wedding_created
  ON email_logs (wedding_id, created_at DESC);
