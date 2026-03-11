-- Migration: Add three_and_under field to guests table
-- This field tracks whether a guest is 3 years old or younger (for meal planning, seating)

-- Step 1: Add the three_and_under column with default value of false
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS three_and_under BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Update the cascade trigger to also cascade three_and_under updates to plus-ones
CREATE OR REPLACE FUNCTION cascade_guest_updates_to_plus_ones()
RETURNS TRIGGER AS $$
BEGIN
  -- If list, family, under_21, or three_and_under was updated for a primary guest, update their plus-ones too
  IF (OLD.list IS DISTINCT FROM NEW.list)
     OR (OLD.family IS DISTINCT FROM NEW.family)
     OR (OLD.under_21 IS DISTINCT FROM NEW.under_21)
     OR (OLD.three_and_under IS DISTINCT FROM NEW.three_and_under) THEN
    -- Update all plus-ones linked to this primary guest
    UPDATE guests
    SET
      list = NEW.list,
      family = NEW.family,
      under_21 = NEW.under_21,
      three_and_under = NEW.three_and_under
    WHERE primary_guest_id = NEW.id
      AND is_plus_one = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update the trigger to include three_and_under changes
DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;

CREATE TRIGGER trigger_cascade_to_plus_ones
  AFTER UPDATE ON guests
  FOR EACH ROW
  WHEN (OLD.list IS DISTINCT FROM NEW.list
        OR OLD.family IS DISTINCT FROM NEW.family
        OR OLD.under_21 IS DISTINCT FROM NEW.under_21
        OR OLD.three_and_under IS DISTINCT FROM NEW.three_and_under)
  EXECUTE FUNCTION cascade_guest_updates_to_plus_ones();

-- Step 4: Add index for filtering by three_and_under
CREATE INDEX IF NOT EXISTS idx_guests_three_and_under ON guests(three_and_under);

-- Add comments for documentation
COMMENT ON COLUMN guests.three_and_under IS 'Indicates if the guest is 3 years old or younger (for meal planning and seating purposes)';
