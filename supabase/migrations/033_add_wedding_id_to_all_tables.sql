-- Migration 033: Add nullable wedding_id FK to all tables + backfill existing rows.
-- Safe to run multiple times (fully idempotent).
--
-- Strategy (per roadmap migration guide):
--   1. Add columns as nullable — nothing breaks on the live site.
--   2. Backfill all existing rows with the default wedding's ID.
--   3. Non-null constraint + query updates come in a future migration.

-- ── Top-level tables ──────────────────────────────────────────────────────────

ALTER TABLE guests               ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE activities           ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE photos               ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE events               ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE seating_charts       ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE parties              ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE gifts                ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE hotels               ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE wedding_todos        ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE guest_photos         ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;

-- ── Junction / child tables ───────────────────────────────────────────────────

ALTER TABLE guest_activity_interests  ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE guest_event_invites       ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE seating_tables            ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE guest_table_assignments   ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;
ALTER TABLE guest_hotel_interests     ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_guests_wedding_id               ON guests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_activities_wedding_id           ON activities(wedding_id);
CREATE INDEX IF NOT EXISTS idx_photos_wedding_id               ON photos(wedding_id);
CREATE INDEX IF NOT EXISTS idx_events_wedding_id               ON events(wedding_id);
CREATE INDEX IF NOT EXISTS idx_seating_charts_wedding_id       ON seating_charts(wedding_id);
CREATE INDEX IF NOT EXISTS idx_parties_wedding_id              ON parties(wedding_id);
CREATE INDEX IF NOT EXISTS idx_gifts_wedding_id                ON gifts(wedding_id);
CREATE INDEX IF NOT EXISTS idx_hotels_wedding_id               ON hotels(wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_todos_wedding_id        ON wedding_todos(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_photos_wedding_id         ON guest_photos(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_activity_interests_wid    ON guest_activity_interests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_event_invites_wid         ON guest_event_invites(wedding_id);
CREATE INDEX IF NOT EXISTS idx_seating_tables_wedding_id       ON seating_tables(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_table_assignments_wid     ON guest_table_assignments(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_hotel_interests_wid       ON guest_hotel_interests(wedding_id);

-- ── Backfill ──────────────────────────────────────────────────────────────────
-- Assign all existing rows to the default wedding.
-- WHERE wedding_id IS NULL makes each UPDATE idempotent.

DO $$
DECLARE
  default_wedding_id UUID;
BEGIN
  SELECT id INTO default_wedding_id
    FROM weddings
   WHERE slug = 'helen-and-enrique'
   LIMIT 1;

  IF default_wedding_id IS NULL THEN
    RAISE EXCEPTION 'Default wedding not found. Run migration 032 first.';
  END IF;

  UPDATE guests              SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE activities          SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE photos              SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE events              SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE seating_charts      SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE parties             SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE gifts               SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE hotels              SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE wedding_todos       SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE guest_photos        SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;

  UPDATE guest_activity_interests SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE guest_event_invites      SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE seating_tables           SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE guest_table_assignments  SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE guest_hotel_interests    SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
END $$;
