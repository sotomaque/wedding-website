-- Migration 046: Per-wedding email templates
-- Adds email_template_type enum, email_templates table, and seeds defaults for existing weddings.
-- Idempotent: safe to run multiple times.

-- 1. Create enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_template_type') THEN
    CREATE TYPE email_template_type AS ENUM (
      'wedding_invitation',
      'rsvp_notification',
      'gift_notification',
      'activities_invitation',
      'event_invitation',
      'event_rsvp_notification',
      'hotel_interest_notification',
      'calendar_invite'
    );
  END IF;
END $$;

-- 2. Create table if not exists
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  type email_template_type NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, type)
);

-- 3. Create index if not exists
CREATE INDEX IF NOT EXISTS idx_email_templates_wedding_id ON email_templates (wedding_id);

-- 4. Seed default templates for all existing weddings that don't have them yet
-- Uses a simple placeholder HTML; admins can customize via the template editor.
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
    'wedding_invitation'::email_template_type,
    'Wedding Invitation',
    'You''re Invited to {{{COUPLE_NAMES}}}''s Wedding!',
    '<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fafaf8;"><div style="text-align: center; padding: 40px 30px; background: #ffffff; border: 1px solid #e8e5e0; border-radius: 8px;"><h1 style="font-size: 28px; color: #2c2c2c; margin-bottom: 8px;">You''re Invited</h1><p style="font-size: 18px; color: #666; margin-bottom: 24px;">{{{COUPLE_NAMES}}}''s Wedding</p><p style="color: #444; margin-bottom: 8px;">{{{WEDDING_DATE}}}</p><p style="color: #444; margin-bottom: 24px;">{{{VENUE_NAME}}}</p><p style="color: #666; font-size: 14px; margin-bottom: 16px;">Your invite code:</p><div style="display: inline-block; padding: 12px 24px; background: #f5f5f0; border: 2px dashed #ccc; border-radius: 8px; font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #2c2c2c; margin-bottom: 24px;">{{{INVITE_CODE}}}</div><br><a href="{{{RSVP_URL}}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea, #764ba2); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 16px;">RSVP Now</a></div></div>',
    '[{"key":"COUPLE_NAMES","description":"Names of the couple"},{"key":"WEDDING_DATE","description":"Formatted wedding date"},{"key":"VENUE_NAME","description":"Ceremony venue name"},{"key":"INVITE_CODE","description":"Guest invite code"},{"key":"RSVP_URL","description":"Direct RSVP link with code"},{"key":"FIRST_NAME","description":"Guest first name"},{"key":"LAST_NAME","description":"Guest last name"},{"key":"APP_URL","description":"Wedding website URL"}]'::jsonb
  ),
  (
    'rsvp_notification'::email_template_type,
    'RSVP Notification',
    'New RSVP: {{{GUEST_NAMES}}} - {{{STATUS_TEXT}}}',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">New RSVP Response</h2><p style="color: #374151;"><strong>{{{GUEST_NAMES}}}</strong> has responded: <strong>{{{STATUS_TEXT}}}</strong></p><p style="color: #6b7280; font-size: 14px;">{{{DETAILS}}}</p></div></div>',
    '[{"key":"GUEST_NAMES","description":"Names of responding guests"},{"key":"STATUS_TEXT","description":"RSVP status (Attending/Not Attending)"},{"key":"DETAILS","description":"Additional RSVP details"}]'::jsonb
  ),
  (
    'gift_notification'::email_template_type,
    'Gift Notification',
    'New Gift Received: {{{GIFT_DESCRIPTION}}}',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">Gift Received!</h2><p style="color: #374151;">{{{GIFT_DESCRIPTION}}}</p><p style="color: #374151;">Amount: <strong>{{{AMOUNT}}}</strong></p><p style="color: #6b7280; font-size: 14px;">From: {{{DONOR_NAME}}}</p></div></div>',
    '[{"key":"GIFT_DESCRIPTION","description":"Description of the gift/fund"},{"key":"AMOUNT","description":"Gift amount"},{"key":"DONOR_NAME","description":"Name of the gift giver"}]'::jsonb
  ),
  (
    'activities_invitation'::email_template_type,
    'Activities Invitation',
    'Things to Do in {{{CITY_NAME}}}',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">Things to Do</h2><p style="color: #374151;">Hi {{{FIRST_NAME}}}, check out some activities and recommendations for your trip!</p><a href="{{{ACTIVITIES_URL}}}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Activities</a></div></div>',
    '[{"key":"FIRST_NAME","description":"Guest first name"},{"key":"CITY_NAME","description":"Wedding city name"},{"key":"ACTIVITIES_URL","description":"Link to things-to-do page"}]'::jsonb
  ),
  (
    'event_invitation'::email_template_type,
    'Event Invitation',
    'You''re Invited: {{{EVENT_NAME}}}',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">{{{EVENT_NAME}}}</h2><p style="color: #374151;">Hi {{{FIRST_NAME}}}, you''re invited to {{{EVENT_NAME}}}!</p><p style="color: #6b7280;">{{{EVENT_DATE}}} at {{{EVENT_TIME}}}</p><p style="color: #6b7280;">{{{EVENT_LOCATION}}}</p><a href="{{{RSVP_URL}}}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 16px;">RSVP</a></div></div>',
    '[{"key":"EVENT_NAME","description":"Name of the event"},{"key":"FIRST_NAME","description":"Guest first name"},{"key":"EVENT_DATE","description":"Event date"},{"key":"EVENT_TIME","description":"Event time"},{"key":"EVENT_LOCATION","description":"Event location"},{"key":"RSVP_URL","description":"RSVP link"}]'::jsonb
  ),
  (
    'event_rsvp_notification'::email_template_type,
    'Event RSVP Notification',
    'Event RSVP: {{{GUEST_NAME}}} - {{{EVENT_NAME}}}',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">Event RSVP Response</h2><p style="color: #374151;"><strong>{{{GUEST_NAME}}}</strong> responded to <strong>{{{EVENT_NAME}}}</strong>: <strong>{{{STATUS_TEXT}}}</strong></p></div></div>',
    '[{"key":"GUEST_NAME","description":"Guest name"},{"key":"EVENT_NAME","description":"Event name"},{"key":"STATUS_TEXT","description":"RSVP status"}]'::jsonb
  ),
  (
    'hotel_interest_notification'::email_template_type,
    'Hotel Interest Notification',
    'Hotel Interest: {{{GUEST_NAME}}} - {{{HOTEL_NAME}}}',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">Hotel Interest</h2><p style="color: #374151;"><strong>{{{GUEST_NAME}}}</strong> is interested in <strong>{{{HOTEL_NAME}}}</strong></p><p style="color: #6b7280; font-size: 14px;">{{{DETAILS}}}</p></div></div>',
    '[{"key":"GUEST_NAME","description":"Guest name"},{"key":"HOTEL_NAME","description":"Hotel name"},{"key":"DETAILS","description":"Additional details"}]'::jsonb
  ),
  (
    'calendar_invite'::email_template_type,
    'Calendar Invite',
    '{{{EVENT_NAME}}} - Save the Date',
    '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;"><h2 style="margin: 0 0 16px; color: #111;">{{{EVENT_NAME}}}</h2><p style="color: #374151;">Hi {{{FIRST_NAME}}}, a calendar invite is attached for {{{EVENT_NAME}}}.</p><p style="color: #6b7280;">{{{EVENT_DATE}}} at {{{EVENT_TIME}}}</p><p style="color: #6b7280;">{{{EVENT_LOCATION}}}</p><p style="color: #999; font-size: 12px; margin-top: 16px;">Please add the attached .ics file to your calendar.</p></div></div>',
    '[{"key":"EVENT_NAME","description":"Event name"},{"key":"FIRST_NAME","description":"Guest first name"},{"key":"EVENT_DATE","description":"Event date"},{"key":"EVENT_TIME","description":"Event time"},{"key":"EVENT_LOCATION","description":"Event location"}]'::jsonb
  )
) AS t(type, name, subject, html_body, variables)
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et
  WHERE et.wedding_id = w.id AND et.type = t.type
);

-- 5. Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies (match existing patterns)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_select') THEN
    CREATE POLICY email_templates_select ON email_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_insert') THEN
    CREATE POLICY email_templates_insert ON email_templates FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_update') THEN
    CREATE POLICY email_templates_update ON email_templates FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'email_templates_delete') THEN
    CREATE POLICY email_templates_delete ON email_templates FOR DELETE USING (true);
  END IF;
END $$;
