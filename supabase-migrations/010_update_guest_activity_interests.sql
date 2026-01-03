-- Migration: Update guest_activity_interests for activity planning feature
-- This allows guests to express interest in activities and optionally specify dates

-- Add invite_code to track which party is interested (works without login)
ALTER TABLE guest_activity_interests
ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Add planned_date for optional date specification
ALTER TABLE guest_activity_interests
ADD COLUMN IF NOT EXISTS planned_date DATE;

-- Add status to distinguish between interested and committed
ALTER TABLE guest_activity_interests
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'interested';

-- Add check constraint for status values
ALTER TABLE guest_activity_interests
DROP CONSTRAINT IF EXISTS guest_activity_interests_status_check;

ALTER TABLE guest_activity_interests
ADD CONSTRAINT guest_activity_interests_status_check
CHECK (status IN ('interested', 'committed'));

-- Create index for querying by invite_code
CREATE INDEX IF NOT EXISTS idx_guest_activity_interests_invite_code
ON guest_activity_interests(invite_code);

-- Create index for querying by activity with status
CREATE INDEX IF NOT EXISTS idx_guest_activity_interests_activity_status
ON guest_activity_interests(activity_id, status);

-- Add comments for documentation
COMMENT ON COLUMN guest_activity_interests.invite_code IS 'The invite code of the party interested in this activity (allows tracking without login)';
COMMENT ON COLUMN guest_activity_interests.planned_date IS 'Optional date when the party plans to do this activity';
COMMENT ON COLUMN guest_activity_interests.status IS 'Interest level: interested (maybe) or committed (definitely going)';
