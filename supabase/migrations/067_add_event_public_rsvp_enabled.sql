-- Migration 067: Per-event public RSVP toggle.
--
-- Lets the couple close an event's public share link (stop accepting RSVPs)
-- without deleting the token. Defaults to TRUE so existing shared links keep
-- working.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS public_rsvp_enabled BOOLEAN NOT NULL DEFAULT TRUE;
