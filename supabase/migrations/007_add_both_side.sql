-- Migration: Add "both" option to side field
-- This migration updates the side constraint to allow guests to be associated with both bride and groom

-- Step 1: Drop the existing side check constraint if it exists
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_side_check;

-- Step 2: Add new side check constraint with 'both' option
ALTER TABLE guests
ADD CONSTRAINT guests_side_check
CHECK (side IN ('bride', 'groom', 'both') OR side IS NULL);

-- Add comment for documentation
COMMENT ON CONSTRAINT guests_side_check ON guests IS 'Allows side to be bride, groom, both, or null';
