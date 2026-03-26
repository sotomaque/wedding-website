-- Migration 047: RSVP reminder schedules & admin summary config
-- Adds reminder_schedules and admin_summary_configs tables, new enum values,
-- and guest reminder tracking columns.
-- Idempotent: safe to run multiple times.

-- 1. Add new enum values to email_template_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rsvp_reminder' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'rsvp_reminder';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin_summary' AND enumtypid = 'email_template_type'::regtype) THEN
    ALTER TYPE email_template_type ADD VALUE 'admin_summary';
  END IF;
END $$;

-- 2. Add reminder tracking columns to guests table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'last_reminder_sent_at') THEN
    ALTER TABLE guests ADD COLUMN last_reminder_sent_at TIMESTAMPTZ(6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'reminder_count') THEN
    ALTER TABLE guests ADD COLUMN reminder_count INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Create reminder_schedules table
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  days_before_deadline INT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, days_before_deadline)
);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_wedding_id ON reminder_schedules (wedding_id);

-- 4. Create admin_summary_configs table
CREATE TABLE IF NOT EXISTS admin_summary_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL UNIQUE REFERENCES weddings(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  frequency_days INT NOT NULL DEFAULT 7,
  last_run_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_summary_configs_wedding_id ON admin_summary_configs (wedding_id);

-- 5. Enable RLS on new tables
ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_summary_configs ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for reminder_schedules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminder_schedules' AND policyname = 'reminder_schedules_select') THEN
    CREATE POLICY reminder_schedules_select ON reminder_schedules FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminder_schedules' AND policyname = 'reminder_schedules_insert') THEN
    CREATE POLICY reminder_schedules_insert ON reminder_schedules FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminder_schedules' AND policyname = 'reminder_schedules_update') THEN
    CREATE POLICY reminder_schedules_update ON reminder_schedules FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminder_schedules' AND policyname = 'reminder_schedules_delete') THEN
    CREATE POLICY reminder_schedules_delete ON reminder_schedules FOR DELETE USING (true);
  END IF;
END $$;

-- 7. RLS policies for admin_summary_configs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_summary_configs' AND policyname = 'admin_summary_configs_select') THEN
    CREATE POLICY admin_summary_configs_select ON admin_summary_configs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_summary_configs' AND policyname = 'admin_summary_configs_insert') THEN
    CREATE POLICY admin_summary_configs_insert ON admin_summary_configs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_summary_configs' AND policyname = 'admin_summary_configs_update') THEN
    CREATE POLICY admin_summary_configs_update ON admin_summary_configs FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_summary_configs' AND policyname = 'admin_summary_configs_delete') THEN
    CREATE POLICY admin_summary_configs_delete ON admin_summary_configs FOR DELETE USING (true);
  END IF;
END $$;

-- 8. Seed default email templates for new types in all existing weddings
INSERT INTO email_templates (wedding_id, type, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  w.id,
  t.type,
  t.name,
  t.subject,
  t.html_body,
  true,
  t.variables,
  now(),
  now()
FROM weddings w
CROSS JOIN (VALUES
  (
    'rsvp_reminder'::email_template_type,
    'RSVP Reminder',
    'Reminder: Please RSVP for {{{COUPLE_NAMES}}}''s Wedding',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">RSVP Reminder</h2><p style="color: #374151;">Hi {{{GUEST_NAME}}}, we haven''t heard back from you yet!</p><p style="color: #374151;">The RSVP deadline for {{{COUPLE_NAMES}}}''s wedding is <strong>{{{RSVP_DEADLINE}}}</strong> ({{{DAYS_REMAINING}}} days away).</p><p style="color: #6b7280; font-size: 14px;">Wedding date: {{{WEDDING_DATE}}}</p><div style="margin: 24px 0; text-align: center;"><a href="{{{RSVP_URL}}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ed8936, #dd6b20); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">RSVP Now</a></div><p style="color: #9ca3af; font-size: 13px; text-align: center;">Your invite code: <strong>{{{INVITE_CODE}}}</strong></p></div></div>',
    '[{"key":"GUEST_NAME","description":"Full name of the guest"},{"key":"COUPLE_NAMES","description":"Names of the couple"},{"key":"WEDDING_DATE","description":"Formatted wedding date"},{"key":"RSVP_DEADLINE","description":"RSVP deadline date"},{"key":"DAYS_REMAINING","description":"Number of days until the RSVP deadline"},{"key":"RSVP_URL","description":"URL for the guest to RSVP"},{"key":"INVITE_CODE","description":"Guest invitation code"}]'::jsonb
  ),
  (
    'admin_summary'::email_template_type,
    'Admin Summary',
    'Wedding Update: {{{COUPLE_NAMES}}} - Guest List Summary',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 4px; color: #111;">Guest List Summary</h2><p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">{{{REPORT_DATE}}}</p><table width="100%" cellpadding="8" cellspacing="0" style="font-size: 14px; color: #374151;"><tr style="background: #f9fafb;"><td>Total A-List</td><td style="text-align:right; font-weight:bold;">{{{TOTAL_A_LIST}}}</td></tr><tr style="background: #f0fff4;"><td>Invited</td><td style="text-align:right; font-weight:bold; color:#276749;">{{{A_LIST_INVITED}}}</td></tr><tr style="background: #fff5f5;"><td>Not Invited</td><td style="text-align:right; font-weight:bold; color:#9b2c2c;">{{{A_LIST_NOT_INVITED}}}</td></tr><tr style="background: #fffff0;"><td>Pending RSVP</td><td style="text-align:right; font-weight:bold; color:#744210;">{{{A_LIST_PENDING}}}</td></tr><tr style="background: #f0fff4;"><td>Attending</td><td style="text-align:right; font-weight:bold; color:#276749;">{{{A_LIST_YES}}}</td></tr><tr style="background: #fff5f5;"><td>Declined</td><td style="text-align:right; font-weight:bold; color:#9b2c2c;">{{{A_LIST_NO}}}</td></tr></table><div style="margin-top: 20px; padding: 16px; background: #fff5f5; border-radius: 6px;"><p style="margin: 0 0 8px; font-weight: 600; color: #9b2c2c; font-size: 14px;">Uninvited A-List Guests</p>{{{UNINVITED_GUESTS}}}</div><div style="text-align: center; margin-top: 24px;"><a href="{{{ADMIN_URL}}}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #38b2ac, #319795); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a></div></div></div>',
    '[{"key":"COUPLE_NAMES","description":"Names of the couple"},{"key":"WEDDING_DATE","description":"Formatted wedding date"},{"key":"TOTAL_A_LIST","description":"Total number of A-list guests"},{"key":"A_LIST_INVITED","description":"Number of A-list guests who have been sent invites"},{"key":"A_LIST_NOT_INVITED","description":"Number of A-list guests who have NOT been sent invites"},{"key":"A_LIST_PENDING","description":"Number of A-list guests with pending RSVP"},{"key":"A_LIST_YES","description":"Number of A-list guests who RSVP''d yes"},{"key":"A_LIST_NO","description":"Number of A-list guests who RSVP''d no"},{"key":"UNINVITED_GUESTS","description":"HTML list of A-list guests not yet sent invites"},{"key":"ADMIN_URL","description":"URL to the admin dashboard"},{"key":"REPORT_DATE","description":"Date this report was generated"}]'::jsonb
  )
) AS t(type, name, subject, html_body, variables)
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et
  WHERE et.wedding_id = w.id AND et.type = t.type
);
