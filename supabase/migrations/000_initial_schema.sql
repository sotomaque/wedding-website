-- Initial schema: base tables that existed before the migration history began.
-- These were originally created via the Supabase dashboard.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Guests
-- ============================================================
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  invite_code TEXT UNIQUE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (rsvp_status IN ('pending', 'yes', 'no')),
  plus_one_allowed BOOLEAN NOT NULL DEFAULT false,
  dietary_restrictions TEXT,
  number_of_resends INTEGER NOT NULL DEFAULT 0,
  mailing_address TEXT,
  physical_invite_sent BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  whatsapp TEXT,
  preferred_contact_method TEXT
    CHECK (preferred_contact_method IN ('email', 'text', 'whatsapp', 'phone_call') OR preferred_contact_method IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON guests;
CREATE POLICY "Allow public read" ON guests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for RSVP" ON guests;
CREATE POLICY "Allow insert for RSVP" ON guests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for RSVP" ON guests;
CREATE POLICY "Allow update for RSVP" ON guests FOR UPDATE USING (true);

-- ============================================================
-- Activities
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read activities" ON activities;
CREATE POLICY "Allow public read activities" ON activities FOR SELECT USING (true);

-- ============================================================
-- Guest Activity Interests (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_activity_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE guest_activity_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read guest_activity_interests" ON guest_activity_interests;
CREATE POLICY "Allow public read guest_activity_interests"
  ON guest_activity_interests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert guest_activity_interests" ON guest_activity_interests;
CREATE POLICY "Allow public insert guest_activity_interests"
  ON guest_activity_interests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update guest_activity_interests" ON guest_activity_interests;
CREATE POLICY "Allow public update guest_activity_interests"
  ON guest_activity_interests FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete guest_activity_interests" ON guest_activity_interests;
CREATE POLICY "Allow public delete guest_activity_interests"
  ON guest_activity_interests FOR DELETE USING (true);

-- ============================================================
-- Photos
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  alt TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read photos" ON photos;
CREATE POLICY "Allow public read photos" ON photos FOR SELECT USING (true);
