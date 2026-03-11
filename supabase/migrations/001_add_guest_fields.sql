-- Migration: Add side, list, and linked guest support
-- Run this in Supabase SQL Editor after the initial schema

-- Add new columns to guests table
ALTER TABLE guests
ADD COLUMN side TEXT CHECK (side IN ('bride', 'groom')),
ADD COLUMN list TEXT NOT NULL DEFAULT 'a' CHECK (list IN ('a', 'b')),
ADD COLUMN is_plus_one BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN primary_guest_id UUID REFERENCES guests(id) ON DELETE CASCADE;

-- Drop the old plus_one fields (we'll use linked records instead)
ALTER TABLE guests
DROP COLUMN IF EXISTS plus_one_name,
DROP COLUMN IF EXISTS plus_one_allowed;

-- Add new plus_one_name column (for when name is provided but record not created yet)
ALTER TABLE guests
ADD COLUMN plus_one_name TEXT;

-- Create index for filtering by side and list
CREATE INDEX idx_guests_side ON guests(side);
CREATE INDEX idx_guests_list ON guests(list);
CREATE INDEX idx_guests_primary_guest ON guests(primary_guest_id);
CREATE INDEX idx_guests_is_plus_one ON guests(is_plus_one);

-- Update comment for clarity
COMMENT ON COLUMN guests.is_plus_one IS 'True if this guest is a plus one (linked to primary_guest_id)';
COMMENT ON COLUMN guests.primary_guest_id IS 'Foreign key to the primary guest if this is a plus one';
COMMENT ON COLUMN guests.plus_one_name IS 'Temporary storage for plus one name before creating the linked record';

-- Update RLS policies to allow admins to manage guests
-- First, drop the existing insert policy
DROP POLICY IF EXISTS "Allow insert for RSVP" ON guests;

-- Create new policies for guest management
-- Allow public to insert only if they have a valid invite code (for RSVP)
CREATE POLICY "Allow RSVP with invite code"
  ON guests FOR INSERT
  WITH CHECK (invite_code IS NOT NULL);

-- Allow service role (admin) to insert guests
CREATE POLICY "Allow admins to insert guests"
  ON guests FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Allow admins to update any guest record
CREATE POLICY "Allow admins to update guests"
  ON guests FOR UPDATE
  USING (auth.role() = 'service_role');

-- Allow admins to delete guests
CREATE POLICY "Allow admins to delete guests"
  ON guests FOR DELETE
  USING (auth.role() = 'service_role');
