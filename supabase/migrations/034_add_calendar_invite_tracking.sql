-- Migration 034: Add calendar invite tracking fields to guests table.
-- Safe to run multiple times (fully idempotent).

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS calendar_invite_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calendar_invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calendar_invite_resend_count INT NOT NULL DEFAULT 0;
