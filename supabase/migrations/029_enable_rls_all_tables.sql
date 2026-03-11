-- Enable RLS on all tables that are currently missing it.
-- Since the app connects via service_role (which bypasses RLS),
-- this is purely a security hardening measure to prevent direct
-- anon-key access to these tables.

-- Tables missing RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_hotel_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;

-- photos already has RLS enabled from 000_initial_schema but not on production
-- (000 only ran on preview branches). Safe to re-enable (idempotent).
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Add read-only public policies for tables that need public access.
-- All write operations go through service_role which bypasses RLS.

-- Events: public can view (displayed on RSVP page)
CREATE POLICY "Allow public read events"
  ON events FOR SELECT USING (true);

-- Hotels: public can view (displayed on hotels page)
CREATE POLICY "Allow public read hotels"
  ON hotels FOR SELECT USING (true);

-- Guest event invites: public can view and update (RSVP flow)
CREATE POLICY "Allow public read guest_event_invites"
  ON guest_event_invites FOR SELECT USING (true);
CREATE POLICY "Allow public update guest_event_invites"
  ON guest_event_invites FOR UPDATE USING (true);

-- Guest hotel interests: public can view and manage (hotel interest flow)
CREATE POLICY "Allow public read guest_hotel_interests"
  ON guest_hotel_interests FOR SELECT USING (true);
CREATE POLICY "Allow public insert guest_hotel_interests"
  ON guest_hotel_interests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update guest_hotel_interests"
  ON guest_hotel_interests FOR UPDATE USING (true);
CREATE POLICY "Allow public delete guest_hotel_interests"
  ON guest_hotel_interests FOR DELETE USING (true);

-- Photos: public can view (gallery page)
-- Policy may already exist from 000 on preview; use a distinct name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'photos' AND policyname = 'Allow public read photos'
  ) THEN
    CREATE POLICY "Allow public read photos" ON photos FOR SELECT USING (true);
  END IF;
END $$;

-- Gifts, seating_charts, seating_tables, guest_table_assignments:
-- Admin-only tables. No public policies needed.
-- service_role bypasses RLS for all admin operations.

-- Wedding todos: already has RLS enabled but no policies.
-- Admin-only, no public policies needed. service_role handles it.
