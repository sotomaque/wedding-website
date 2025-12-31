-- Migration: Add linked guest support (is_plus_one and primary_guest_id)
-- Run this in Supabase SQL Editor

-- Add new columns for linked guest records
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS is_plus_one BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_guest_id UUID REFERENCES guests(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_primary_guest ON guests(primary_guest_id);
CREATE INDEX IF NOT EXISTS idx_guests_is_plus_one ON guests(is_plus_one);

-- Update comments for clarity
COMMENT ON COLUMN guests.is_plus_one IS 'True if this guest is a plus one (linked to primary_guest_id)';
COMMENT ON COLUMN guests.primary_guest_id IS 'Foreign key to the primary guest if this is a plus one';
COMMENT ON COLUMN guests.plus_one_name IS 'Temporary storage for plus one name. If provided during admin creation, a linked record will be created automatically.';
