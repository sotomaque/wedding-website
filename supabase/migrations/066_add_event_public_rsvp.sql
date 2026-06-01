-- Migration 066: Public per-event RSVP share links.
--
-- Adds:
--   * events.capacity            — optional cap on confirmed attendees (null = unlimited)
--   * events.public_rsvp_token   — unguessable token for the shareable RSVP link
--   * guests.self_registered     — flags guests who added themselves via a public
--                                  per-event link (by name) for admin review

ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS public_rsvp_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_public_rsvp_token
  ON events (public_rsvp_token);

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS self_registered BOOLEAN NOT NULL DEFAULT FALSE;
