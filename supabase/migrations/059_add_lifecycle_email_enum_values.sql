-- Migration 059: Add guest/donor-facing lifecycle email template types.
-- rsvp_confirmation: sent to the guest(s) after they submit their RSVP.
-- gift_thank_you:    sent to a donor when an admin marks a gift thanked.
-- Enum values must be added in their own migration (Postgres can't use a new
-- enum value in the same transaction that adds it — the seed lives in 060).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rsvp_confirmation' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'rsvp_confirmation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gift_thank_you' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'gift_thank_you';
  END IF;
END $$;
