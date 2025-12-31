-- Migration: Split name into first_name and last_name
-- Run this in Supabase SQL Editor

-- Add new columns for first_name and last_name
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing name data by splitting on first space
-- This assumes format "FirstName LastName"
UPDATE guests
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE ''
  END
WHERE name IS NOT NULL AND first_name IS NULL;

-- Make first_name required (after migration)
ALTER TABLE guests
ALTER COLUMN first_name SET NOT NULL;

-- Drop the old name column
ALTER TABLE guests
DROP COLUMN IF EXISTS name;

-- Add comments to document the columns
COMMENT ON COLUMN guests.first_name IS 'Guest first name (required)';
COMMENT ON COLUMN guests.last_name IS 'Guest last name (optional)';
