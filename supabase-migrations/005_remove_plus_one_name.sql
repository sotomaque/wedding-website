-- Migration: Remove plus_one_name column, make email nullable, and allow shared invite codes
-- Run this in Supabase SQL Editor

-- Remove the plus_one_name column since we're using the relational approach
ALTER TABLE guests
DROP COLUMN IF EXISTS plus_one_name;

-- Make email nullable since plus-ones don't have their own email addresses
ALTER TABLE guests
ALTER COLUMN email DROP NOT NULL;

-- Drop unique constraint on invite_code so plus-ones can share the code with their primary guest
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_invite_code_key;

-- Drop unique constraint on email since it's now nullable and we don't want empty string conflicts
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_email_key;

-- Add comments to document the changes
COMMENT ON COLUMN guests.email IS 'Email address of the guest. Can be null for plus-one guests who share the primary guest''s email.';
COMMENT ON COLUMN guests.invite_code IS 'Invite code for RSVP. Plus-ones share the same invite code as their primary guest.';
COMMENT ON COLUMN guests.primary_guest_id IS 'References the primary guest ID if this guest is a plus-one (is_plus_one = true)';
COMMENT ON COLUMN guests.plus_one_allowed IS 'Indicates if this primary guest is allowed to bring a plus-one';
