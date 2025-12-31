-- Add plus_one_allowed column to guests table
-- This distinguishes between "no plus-one allowed" and "plus-one allowed but name unknown"

ALTER TABLE guests
ADD COLUMN IF NOT EXISTS plus_one_allowed BOOLEAN DEFAULT FALSE;

-- Set plus_one_allowed to true for guests who already have a plus_one_name
UPDATE guests
SET plus_one_allowed = TRUE
WHERE plus_one_name IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN guests.plus_one_allowed IS 'Whether this guest is allowed to bring a plus-one (separate from knowing the plus-one name)';
