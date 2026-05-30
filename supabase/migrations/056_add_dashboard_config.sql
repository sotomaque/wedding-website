-- Add dashboard_config JSONB column to weddings table
-- Stores admin dashboard customization (e.g. RSVP count exclusions)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weddings' AND column_name = 'dashboard_config'
  ) THEN
    ALTER TABLE weddings ADD COLUMN dashboard_config jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;
