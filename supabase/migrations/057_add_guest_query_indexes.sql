-- Migration 057: Add indexes for the most common guest / event-invite query
-- filters that were previously unindexed.
--
-- - guests(wedding_id, rsvp_status): rsvp_status is the single most-filtered
--   column — dashboard headcount, RSVP insights, AI chat stats, the export
--   wizard, and the guest table all filter/group on it within a wedding.
-- - guests(wedding_id, number_of_resends): invite "not sent / sent / resent"
--   filters and reminder logic.
-- - guest_event_invites(event_id, rsvp_status): per-event confirmed/declined/
--   pending tallies on the events dashboard.
--
-- IF NOT EXISTS keeps this safe to re-run. Plain (non-CONCURRENT) creation so
-- it runs inside the migration transaction; these tables are small per tenant.

CREATE INDEX IF NOT EXISTS idx_guests_wedding_rsvp_status
  ON guests (wedding_id, rsvp_status);

CREATE INDEX IF NOT EXISTS idx_guests_wedding_resends
  ON guests (wedding_id, number_of_resends);

CREATE INDEX IF NOT EXISTS idx_guest_event_invites_event_rsvp
  ON guest_event_invites (event_id, rsvp_status);
