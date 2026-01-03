-- Migration: Add bridal party fields
-- This adds gender and bridal party role fields to guests

-- Add gender column
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female') OR gender IS NULL);

-- Add bridal party role column
-- Note: groomsman/best_man are only valid for males, bridesmaid/maid_of_honor are only valid for females
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS bridal_party_role TEXT CHECK (
  bridal_party_role IN ('groomsman', 'best_man', 'bridesmaid', 'maid_of_honor')
  OR bridal_party_role IS NULL
);

-- Add comments
COMMENT ON COLUMN guests.gender IS 'Gender of the guest: male, female, or other';
COMMENT ON COLUMN guests.bridal_party_role IS 'Bridal party role: groomsman, best_man (males only), bridesmaid, maid_of_honor (females only)';

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_guests_gender ON guests(gender);
CREATE INDEX IF NOT EXISTS idx_guests_bridal_party_role ON guests(bridal_party_role);

-- Add constraint to ensure bridal party roles match gender
-- Best man/groomsman requires male, maid of honor/bridesmaid requires female
ALTER TABLE guests
ADD CONSTRAINT chk_bridal_party_gender CHECK (
  bridal_party_role IS NULL
  OR (bridal_party_role IN ('groomsman', 'best_man') AND gender = 'male')
  OR (bridal_party_role IN ('bridesmaid', 'maid_of_honor') AND gender = 'female')
);

-- Update comment for gender
COMMENT ON COLUMN guests.gender IS 'Gender of the guest: male or female';
