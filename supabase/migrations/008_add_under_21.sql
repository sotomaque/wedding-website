-- Migration: Add under_21 field to guests table
-- This field tracks whether a guest is under 21 years old (for alcohol service purposes)

-- Step 1: Add the under_21 column with default value of false
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS under_21 BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Update the cascade trigger to also cascade under_21 updates to plus-ones
CREATE OR REPLACE FUNCTION cascade_guest_updates_to_plus_ones()
RETURNS TRIGGER AS $$
BEGIN
  -- If list, family, or under_21 was updated for a primary guest, update their plus-ones too
  IF (OLD.list IS DISTINCT FROM NEW.list)
     OR (OLD.family IS DISTINCT FROM NEW.family)
     OR (OLD.under_21 IS DISTINCT FROM NEW.under_21) THEN
    -- Update all plus-ones linked to this primary guest
    UPDATE guests
    SET
      list = NEW.list,
      family = NEW.family,
      under_21 = NEW.under_21
    WHERE primary_guest_id = NEW.id
      AND is_plus_one = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update the trigger to include under_21 changes
DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;

CREATE TRIGGER trigger_cascade_to_plus_ones
  AFTER UPDATE ON guests
  FOR EACH ROW
  WHEN (OLD.list IS DISTINCT FROM NEW.list
        OR OLD.family IS DISTINCT FROM NEW.family
        OR OLD.under_21 IS DISTINCT FROM NEW.under_21)
  EXECUTE FUNCTION cascade_guest_updates_to_plus_ones();

-- Step 4: Add index for filtering by under_21
CREATE INDEX IF NOT EXISTS idx_guests_under_21 ON guests(under_21);

-- Add comments for documentation
COMMENT ON COLUMN guests.under_21 IS 'Indicates if the guest is under 21 years old (for alcohol service purposes)';
