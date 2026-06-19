-- Per-event visibility flag.
--
-- Lets the couple mark an event as private (e.g. a bachelor party) so it is
-- hidden from the public wedding-site schedule while still living in the admin
-- events list and remaining usable for direct/shareable RSVP links. Defaults to
-- true so every existing event stays visible (no behavior change on rollout).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
