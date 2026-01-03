-- Migration: Make event fields optional (only name required)
-- This allows creating events with just a name, filling in details once planned

-- Make event_date nullable
ALTER TABLE events ALTER COLUMN event_date DROP NOT NULL;

-- Make start_time nullable
ALTER TABLE events ALTER COLUMN start_time DROP NOT NULL;

-- Make location_name nullable
ALTER TABLE events ALTER COLUMN location_name DROP NOT NULL;
