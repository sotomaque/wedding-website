-- Migration 045: Backfill ALL null wedding_id values and enforce NOT NULL.
-- Migration 041 failed on production because guests/parties/etc had null wedding_id
-- from rows created between migration 033 (added column) and code deployment (scoped queries).
-- This migration backfills everything to the default wedding, then re-attempts NOT NULL.

DO $$
DECLARE
  default_wedding_id UUID;
BEGIN
  SELECT id INTO default_wedding_id FROM weddings WHERE slug = 'helen-and-enrique' LIMIT 1;

  IF default_wedding_id IS NULL THEN
    RAISE NOTICE 'Default wedding not found — skipping backfill (no data to fix)';
    RETURN;
  END IF;

  -- Backfill ALL main tables
  UPDATE guests SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE parties SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE events SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE activities SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE photos SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE gifts SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE hotels SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE seating_charts SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE seating_tables SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE wedding_todos SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE guest_photos SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE documents SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;
  UPDATE service_links SET wedding_id = default_wedding_id WHERE wedding_id IS NULL;

  -- Backfill junction tables from their parent guest
  UPDATE guest_event_invites gei
  SET wedding_id = g.wedding_id
  FROM guests g
  WHERE gei.guest_id = g.id AND gei.wedding_id IS NULL;

  UPDATE guest_activity_interests gai
  SET wedding_id = g.wedding_id
  FROM guests g
  WHERE gai.guest_id = g.id AND gai.wedding_id IS NULL;

  UPDATE guest_hotel_interests ghi
  SET wedding_id = g.wedding_id
  FROM guests g
  WHERE ghi.guest_id = g.id AND ghi.wedding_id IS NULL;

  UPDATE guest_table_assignments gta
  SET wedding_id = g.wedding_id
  FROM guests g
  WHERE gta.guest_id = g.id AND gta.wedding_id IS NULL;

  -- Delete any truly orphaned rows
  DELETE FROM guest_event_invites WHERE wedding_id IS NULL;
  DELETE FROM guest_activity_interests WHERE wedding_id IS NULL;
  DELETE FROM guest_hotel_interests WHERE wedding_id IS NULL;
  DELETE FROM guest_table_assignments WHERE wedding_id IS NULL;
END $$;

-- Now enforce NOT NULL (idempotent — safe to run even if 041 partially succeeded)
-- Using DO block to handle columns that are already NOT NULL
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'activities', 'documents', 'events', 'gifts',
    'guest_activity_interests', 'guest_event_invites',
    'guest_hotel_interests', 'guest_photos', 'guest_table_assignments',
    'guests', 'hotels', 'parties', 'photos',
    'seating_charts', 'seating_tables', 'service_links', 'wedding_todos'
  ])
  LOOP
    -- Check if column is still nullable before altering
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'wedding_id' AND is_nullable = 'YES'
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN wedding_id SET NOT NULL', tbl);
      RAISE NOTICE 'Set NOT NULL on %.wedding_id', tbl;
    ELSE
      RAISE NOTICE '%.wedding_id already NOT NULL — skipping', tbl;
    END IF;
  END LOOP;
END $$;
