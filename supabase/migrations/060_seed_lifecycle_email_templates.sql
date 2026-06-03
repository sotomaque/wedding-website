-- Migration 060: Seed rsvp_confirmation + gift_thank_you templates for existing
-- weddings (EN and ES). Idempotent — only inserts where the template is absent.
-- Mirrors 052 (welcome seed). New weddings get these via getDefaultTemplates().

-- RSVP confirmation (English)
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'rsvp_confirmation', 'en', 'RSVP Confirmation',
  'We received your RSVP — {{{COUPLE_NAMES}}}',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;"><h2 style="color:#48bb78;">Thank you, {{{GUEST_NAME}}}!</h2><p>We''ve received your RSVP for <strong>{{{COUPLE_NAMES}}}</strong>''s wedding.</p><div style="background:#f7f7f7;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;"><strong>Your response:</strong> {{{RSVP_STATUS}}}</p><p style="margin:8px 0 0;"><strong>Wedding date:</strong> {{{WEDDING_DATE}}}</p></div><p>Need to make a change? You can update your response anytime using your invite code <strong>{{{INVITE_CODE}}}</strong>:</p><a href="{{{RSVP_URL}}}" style="display:inline-block;padding:12px 24px;background:#48bb78;color:#fff;text-decoration:none;border-radius:6px;">Update my RSVP</a><p style="color:#888;font-size:13px;margin-top:24px;">We can''t wait to celebrate with you!<br/>— {{{COUPLE_NAMES}}}</p></div>',
  true,
  '[{"key":"GUEST_NAME","description":"The guest''s first name"},{"key":"COUPLE_NAMES","description":"Names of the couple"},{"key":"RSVP_STATUS","description":"Attending / Not attending summary"},{"key":"WEDDING_DATE","description":"Formatted wedding date"},{"key":"INVITE_CODE","description":"The guest''s invite code"},{"key":"RSVP_URL","description":"Link to update the RSVP"}]'::jsonb,
  now(), now()
FROM weddings w
WHERE NOT EXISTS (SELECT 1 FROM email_templates et WHERE et.wedding_id = w.id AND et.type = 'rsvp_confirmation' AND et.language = 'en');

-- RSVP confirmation (Spanish)
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'rsvp_confirmation', 'es', 'Confirmacion de RSVP',
  'Recibimos tu confirmacion — {{{COUPLE_NAMES}}}',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;"><h2 style="color:#48bb78;">Gracias, {{{GUEST_NAME}}}!</h2><p>Hemos recibido tu confirmacion para la boda de <strong>{{{COUPLE_NAMES}}}</strong>.</p><div style="background:#f7f7f7;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;"><strong>Tu respuesta:</strong> {{{RSVP_STATUS}}}</p><p style="margin:8px 0 0;"><strong>Fecha de la boda:</strong> {{{WEDDING_DATE}}}</p></div><p>Necesitas hacer un cambio? Puedes actualizar tu respuesta en cualquier momento con tu codigo <strong>{{{INVITE_CODE}}}</strong>:</p><a href="{{{RSVP_URL}}}" style="display:inline-block;padding:12px 24px;background:#48bb78;color:#fff;text-decoration:none;border-radius:6px;">Actualizar mi RSVP</a><p style="color:#888;font-size:13px;margin-top:24px;">Nos encantaria celebrar contigo!<br/>— {{{COUPLE_NAMES}}}</p></div>',
  true,
  '[{"key":"GUEST_NAME","description":"Nombre del invitado"},{"key":"COUPLE_NAMES","description":"Nombres de la pareja"},{"key":"RSVP_STATUS","description":"Resumen de asistencia"},{"key":"WEDDING_DATE","description":"Fecha de la boda"},{"key":"INVITE_CODE","description":"Codigo de invitacion"},{"key":"RSVP_URL","description":"Enlace para actualizar el RSVP"}]'::jsonb,
  now(), now()
FROM weddings w
WHERE NOT EXISTS (SELECT 1 FROM email_templates et WHERE et.wedding_id = w.id AND et.type = 'rsvp_confirmation' AND et.language = 'es');

-- Gift thank-you (English)
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'gift_thank_you', 'en', 'Gift Thank You',
  'Thank you for your generous gift — {{{COUPLE_NAMES}}}',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;"><h2 style="color:#667eea;">Thank you, {{{DONOR_NAME}}}!</h2><p>We are so grateful for your generous gift of <strong>{{{AMOUNT}}}</strong> toward our {{{GIFT_TYPE}}}.</p><p>Your kindness means the world to us as we begin this next chapter together. Thank you for being part of our celebration.</p><p style="color:#888;font-size:13px;margin-top:24px;">With love and gratitude,<br/>— {{{COUPLE_NAMES}}}</p></div>',
  true,
  '[{"key":"DONOR_NAME","description":"The donor''s name"},{"key":"AMOUNT","description":"Formatted gift amount"},{"key":"GIFT_TYPE","description":"Type of gift (e.g. Honeymoon Fund)"},{"key":"COUPLE_NAMES","description":"Names of the couple"}]'::jsonb,
  now(), now()
FROM weddings w
WHERE NOT EXISTS (SELECT 1 FROM email_templates et WHERE et.wedding_id = w.id AND et.type = 'gift_thank_you' AND et.language = 'en');

-- Gift thank-you (Spanish)
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'gift_thank_you', 'es', 'Agradecimiento por Regalo',
  'Gracias por tu generoso regalo — {{{COUPLE_NAMES}}}',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;"><h2 style="color:#667eea;">Gracias, {{{DONOR_NAME}}}!</h2><p>Estamos muy agradecidos por tu generoso regalo de <strong>{{{AMOUNT}}}</strong> para nuestro {{{GIFT_TYPE}}}.</p><p>Tu generosidad significa muchisimo para nosotros al comenzar este nuevo capitulo juntos. Gracias por ser parte de nuestra celebracion.</p><p style="color:#888;font-size:13px;margin-top:24px;">Con amor y gratitud,<br/>— {{{COUPLE_NAMES}}}</p></div>',
  true,
  '[{"key":"DONOR_NAME","description":"Nombre del donante"},{"key":"AMOUNT","description":"Monto del regalo"},{"key":"GIFT_TYPE","description":"Tipo de regalo"},{"key":"COUPLE_NAMES","description":"Nombres de la pareja"}]'::jsonb,
  now(), now()
FROM weddings w
WHERE NOT EXISTS (SELECT 1 FROM email_templates et WHERE et.wedding_id = w.id AND et.type = 'gift_thank_you' AND et.language = 'es');
