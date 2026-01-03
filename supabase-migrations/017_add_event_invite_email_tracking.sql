-- Migration: Add email tracking fields to guest_event_invites
-- This enables tracking whether invitation emails have been sent for custom events

-- Add email tracking fields to guest_event_invites
ALTER TABLE guest_event_invites
ADD COLUMN email_sent BOOLEAN DEFAULT false,
ADD COLUMN email_sent_at TIMESTAMPTZ NULL,
ADD COLUMN email_resend_count INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN guest_event_invites.email_sent IS 'Whether invitation email has been sent for this event';
COMMENT ON COLUMN guest_event_invites.email_sent_at IS 'Timestamp of when the invitation email was last sent';
COMMENT ON COLUMN guest_event_invites.email_resend_count IS 'Number of times the invitation email has been resent';

-- Create index for efficient querying of pending invites (invited but not emailed)
CREATE INDEX IF NOT EXISTS idx_guest_event_invites_email_sent
ON guest_event_invites(event_id, email_sent);
