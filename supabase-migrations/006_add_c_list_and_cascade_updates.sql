-- Migration: Add C list and cascade list/family updates to plus-ones
-- This migration:
-- 1. Updates the list constraint to allow 'a', 'b', or 'c'
-- 2. Adds a trigger to cascade list and family updates from primary guests to their plus-ones

-- Step 1: Drop the existing list check constraint
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_list_check;

-- Step 2: Add new list check constraint with 'c' option
ALTER TABLE guests
ADD CONSTRAINT guests_list_check
CHECK (list IN ('a', 'b', 'c'));

-- Step 3: Create a function to cascade updates to plus-ones
CREATE OR REPLACE FUNCTION cascade_guest_updates_to_plus_ones()
RETURNS TRIGGER AS $$
BEGIN
  -- If list or family was updated for a primary guest, update their plus-ones too
  IF (OLD.list IS DISTINCT FROM NEW.list) OR (OLD.family IS DISTINCT FROM NEW.family) THEN
    -- Update all plus-ones linked to this primary guest
    UPDATE guests
    SET
      list = NEW.list,
      family = NEW.family
    WHERE primary_guest_id = NEW.id
      AND is_plus_one = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to run the function after guest updates
DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;

CREATE TRIGGER trigger_cascade_to_plus_ones
  AFTER UPDATE ON guests
  FOR EACH ROW
  WHEN (OLD.list IS DISTINCT FROM NEW.list OR OLD.family IS DISTINCT FROM NEW.family)
  EXECUTE FUNCTION cascade_guest_updates_to_plus_ones();

-- Add comments for documentation
COMMENT ON FUNCTION cascade_guest_updates_to_plus_ones() IS 'Automatically updates list and family status for plus-ones when their primary guest is updated';
COMMENT ON TRIGGER trigger_cascade_to_plus_ones ON guests IS 'Cascades list and family updates from primary guests to their plus-ones';
