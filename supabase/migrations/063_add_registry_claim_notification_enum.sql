-- Migration 063: Add the registry_claim_notification email template type.
-- Sent to the couple's notification recipients when a guest claims a gift.
-- Enum values must be added in their own migration before being used (seed in 064).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'registry_claim_notification' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'registry_claim_notification';
  END IF;
END $$;
