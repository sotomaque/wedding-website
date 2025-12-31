-- Expand guest schema with contact and mailing information
-- This migration adds fields for tracking invites, contact preferences, and mailing details

-- Add number_of_resends column (tracks how many times invite email was resent)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS number_of_resends INTEGER DEFAULT 0;

-- Add mailing address (optional, for physical invites)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS mailing_address TEXT;

-- Add physical invite tracking
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS physical_invite_sent BOOLEAN DEFAULT FALSE;

-- Add phone number (optional)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add WhatsApp (optional, could be same as phone or different)
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Add preferred contact method
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT;

-- Add check constraint for preferred_contact_method
ALTER TABLE guests
DROP CONSTRAINT IF EXISTS guests_preferred_contact_method_check;

ALTER TABLE guests
ADD CONSTRAINT guests_preferred_contact_method_check
CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'text', 'whatsapp', 'phone_call'));

-- Add comments to document the new columns
COMMENT ON COLUMN guests.number_of_resends IS 'Number of times the invitation email has been resent';
COMMENT ON COLUMN guests.mailing_address IS 'Physical mailing address for sending physical invitations';
COMMENT ON COLUMN guests.physical_invite_sent IS 'Whether a physical invitation has been sent to this guest';
COMMENT ON COLUMN guests.phone_number IS 'Guest phone number for contact';
COMMENT ON COLUMN guests.whatsapp IS 'Guest WhatsApp number (may differ from phone number)';
COMMENT ON COLUMN guests.preferred_contact_method IS 'Guest preferred method of contact: email, text, whatsapp, or phone_call';
