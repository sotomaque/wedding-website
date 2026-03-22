-- Migration 041: Make wedding_id NOT NULL on all tables.
-- All rows have been backfilled and all queries are scoped — safe to enforce.

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
