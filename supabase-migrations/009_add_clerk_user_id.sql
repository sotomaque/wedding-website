-- Migration: Add clerk_user_id to guests table for optional persistent sessions
-- This allows guests to optionally login with Clerk for easier return visits

-- Add clerk_user_id column
ALTER TABLE guests ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Create index for looking up guests by their Clerk user ID
CREATE INDEX IF NOT EXISTS idx_guests_clerk_user_id ON guests(clerk_user_id);

-- Add comment for documentation
COMMENT ON COLUMN guests.clerk_user_id IS 'Optional Clerk user ID for guests who choose to login for persistent sessions';
