-- Migration: Add events table for wedding events management
-- Events are distinct from activities - they are scheduled wedding events that guests are invited to

-- Create events table
-- Only name is required; other fields can be filled in once planned
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  location_name TEXT,
  location_address TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guest_event_invites junction table to track which guests are invited to which events
CREATE TABLE IF NOT EXISTS guest_event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rsvp_status TEXT CHECK (rsvp_status IN ('pending', 'yes', 'no')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guest_id, event_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_display_order ON events(display_order);
CREATE INDEX IF NOT EXISTS idx_guest_event_invites_guest_id ON guest_event_invites(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_event_invites_event_id ON guest_event_invites(event_id);

-- Add comments
COMMENT ON TABLE events IS 'Wedding events that guests can be invited to';
COMMENT ON COLUMN events.is_default IS 'If true, all guests are automatically invited to this event';
COMMENT ON TABLE guest_event_invites IS 'Junction table tracking which guests are invited to which events';

-- Seed with the two main wedding events
INSERT INTO events (name, description, event_date, start_time, end_time, location_name, location_address, latitude, longitude, is_default, display_order)
VALUES
  (
    'Wedding Ceremony',
    'Join us as we exchange vows at the beautiful Immaculata Church',
    '2026-07-30',
    '16:00:00',
    '17:00:00',
    'The Immaculata Church',
    '5998 Alcalá Park, San Diego, CA 92110',
    32.7719,
    -117.1902,
    true,
    1
  ),
  (
    'Wedding Reception',
    'Dinner, Dancing & Celebration',
    '2026-07-30',
    '18:00:00',
    '22:00:00',
    'Headquarters at Seaport',
    '789 W Harbor Dr Suite 148, San Diego, CA 92101',
    32.7091,
    -117.1689,
    true,
    2
  );

-- Create a function to automatically invite all guests to default events
CREATE OR REPLACE FUNCTION invite_all_guests_to_default_events()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new default event is created, invite all existing guests
  IF NEW.is_default = true THEN
    INSERT INTO guest_event_invites (guest_id, event_id)
    SELECT g.id, NEW.id
    FROM guests g
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_event_invites gei
      WHERE gei.guest_id = g.id AND gei.event_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-invite guests to new default events
DROP TRIGGER IF EXISTS trigger_invite_guests_to_default_event ON events;
CREATE TRIGGER trigger_invite_guests_to_default_event
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION invite_all_guests_to_default_events();

-- Create a function to invite new guests to all default events
CREATE OR REPLACE FUNCTION invite_new_guest_to_default_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO guest_event_invites (guest_id, event_id)
  SELECT NEW.id, e.id
  FROM events e
  WHERE e.is_default = true
  AND NOT EXISTS (
    SELECT 1 FROM guest_event_invites gei
    WHERE gei.guest_id = NEW.id AND gei.event_id = e.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-invite new guests to default events
DROP TRIGGER IF EXISTS trigger_invite_new_guest_to_defaults ON guests;
CREATE TRIGGER trigger_invite_new_guest_to_defaults
  AFTER INSERT ON guests
  FOR EACH ROW
  EXECUTE FUNCTION invite_new_guest_to_default_events();

-- Invite all existing guests to the default events we just created
INSERT INTO guest_event_invites (guest_id, event_id)
SELECT g.id, e.id
FROM guests g
CROSS JOIN events e
WHERE e.is_default = true
ON CONFLICT (guest_id, event_id) DO NOTHING;
