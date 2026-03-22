-- Migration 044: Fix both guest invite triggers to include wedding_id.
-- Now that wedding_id is NOT NULL on guest_event_invites, both triggers
-- must include it when creating invite records.

-- Trigger 1: When a NEW GUEST is inserted, invite them to default events
CREATE OR REPLACE FUNCTION invite_new_guest_to_default_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO guest_event_invites (guest_id, event_id, wedding_id)
  SELECT NEW.id, e.id, NEW.wedding_id
  FROM events e
  WHERE e.is_default = true
  AND e.wedding_id = NEW.wedding_id
  AND NOT EXISTS (
    SELECT 1 FROM guest_event_invites gei
    WHERE gei.guest_id = NEW.id AND gei.event_id = e.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger 2: When a NEW DEFAULT EVENT is created, invite all existing guests
CREATE OR REPLACE FUNCTION invite_all_guests_to_default_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    INSERT INTO guest_event_invites (guest_id, event_id, wedding_id)
    SELECT g.id, NEW.id, NEW.wedding_id
    FROM guests g
    WHERE g.wedding_id = NEW.wedding_id
    AND NOT EXISTS (
      SELECT 1 FROM guest_event_invites gei
      WHERE gei.guest_id = g.id AND gei.event_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
