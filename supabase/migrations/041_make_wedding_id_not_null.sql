-- Migration 041: Make wedding_id NOT NULL on all tables.
-- First backfill any remaining nulls (e.g., from triggers that don't yet include wedding_id).

-- Backfill guest_event_invites from the guest's wedding_id
UPDATE guest_event_invites gei
SET wedding_id = g.wedding_id
FROM guests g
WHERE gei.guest_id = g.id
AND gei.wedding_id IS NULL;

-- Backfill any other junction tables that might have nulls from triggers
UPDATE guest_activity_interests gai
SET wedding_id = g.wedding_id
FROM guests g
WHERE gai.guest_id = g.id
AND gai.wedding_id IS NULL;

UPDATE guest_hotel_interests ghi
SET wedding_id = g.wedding_id
FROM guests g
WHERE ghi.guest_id = g.id
AND ghi.wedding_id IS NULL;

UPDATE guest_table_assignments gta
SET wedding_id = g.wedding_id
FROM guests g
WHERE gta.guest_id = g.id
AND gta.wedding_id IS NULL;

-- Delete any orphaned rows that can't be backfilled
DELETE FROM guest_event_invites WHERE wedding_id IS NULL;
DELETE FROM guest_activity_interests WHERE wedding_id IS NULL;
DELETE FROM guest_hotel_interests WHERE wedding_id IS NULL;
DELETE FROM guest_table_assignments WHERE wedding_id IS NULL;

-- Now safe to enforce NOT NULL
ALTER TABLE activities ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE events ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE gifts ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE guest_activity_interests ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE guest_event_invites ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE guest_hotel_interests ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE guest_photos ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE guest_table_assignments ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE guests ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE hotels ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE parties ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE photos ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE seating_charts ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE seating_tables ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE service_links ALTER COLUMN wedding_id SET NOT NULL;
ALTER TABLE wedding_todos ALTER COLUMN wedding_id SET NOT NULL;
