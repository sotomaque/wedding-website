-- Migration: Add activities email tracking to guests table
-- This tracks when and how many times the activities invitation email was sent

-- Add activities_email_sent boolean
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS activities_email_sent BOOLEAN DEFAULT FALSE;

-- Add activities_email_sent_at timestamp
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS activities_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Add activities_email_resend_count for tracking resends
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS activities_email_resend_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN guests.activities_email_sent IS 'Whether the activities invitation email has been sent to this guest';
COMMENT ON COLUMN guests.activities_email_sent_at IS 'Timestamp of when the activities email was last sent';
COMMENT ON COLUMN guests.activities_email_resend_count IS 'Number of times the activities email has been resent';
