-- Migration 047: Add new enum values for email_template_type
-- Must be in its own migration (separate transaction) because PostgreSQL
-- cannot use new enum values in the same transaction that adds them.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rsvp_reminder' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'rsvp_reminder';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin_summary' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'admin_summary';
  END IF;
END $$;
