-- Migration 049: i18n – per-guest language & per-template language
-- Idempotent: safe to run multiple times.

-- 1. Add preferred_language to guests (nullable TEXT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE guests ADD COLUMN preferred_language TEXT;
  END IF;
END $$;

-- 2. Add language to email_templates (TEXT NOT NULL DEFAULT 'en')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'language'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
  END IF;
END $$;

-- 3. Drop old unique constraint on email_templates (wedding_id, type)
--    and add new one on (wedding_id, type, language)
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'email_templates_wedding_id_type_key'
  ) THEN
    ALTER TABLE email_templates DROP CONSTRAINT email_templates_wedding_id_type_key;
  END IF;

  -- Add new constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'email_templates_wedding_id_type_language_key'
  ) THEN
    ALTER TABLE email_templates
      ADD CONSTRAINT email_templates_wedding_id_type_language_key
      UNIQUE (wedding_id, type, language);
  END IF;
END $$;

-- 4. Add default_language to weddings (TEXT NOT NULL DEFAULT 'en')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weddings' AND column_name = 'default_language'
  ) THEN
    ALTER TABLE weddings ADD COLUMN default_language TEXT NOT NULL DEFAULT 'en';
  END IF;
END $$;
