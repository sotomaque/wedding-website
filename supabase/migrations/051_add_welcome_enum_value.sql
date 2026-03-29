DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'welcome' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'welcome';
  END IF;
END $$;
