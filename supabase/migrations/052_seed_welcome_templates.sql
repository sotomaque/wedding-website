-- Migration 052: Seed welcome email templates for existing weddings
-- Adds welcome templates (EN and ES) for all weddings that don't already have them.
-- Idempotent: safe to run multiple times.

-- English welcome template
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(),
  w.id,
  'welcome',
  'en',
  'Welcome',
  'Welcome to The Ceremony, {{{COUPLE_NAMES}}}!',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2>Welcome, {{{COUPLE_NAMES}}}!</h2><p>Congratulations on your upcoming wedding! We are thrilled to have you on The Ceremony.</p><p>Here are a few things to get started:</p><ul><li>Add your guests</li><li>Customize your wedding site</li><li>Set up your registry</li></ul><a href="{{{ADMIN_URL}}}" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;">Go to Dashboard</a></div>',
  true,
  '[{"key":"COUPLE_NAMES","description":"Names of the couple"},{"key":"ADMIN_URL","description":"URL to the admin dashboard"},{"key":"APP_URL","description":"Base application URL"}]'::jsonb,
  now(),
  now()
FROM weddings w
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et
  WHERE et.wedding_id = w.id AND et.type = 'welcome' AND et.language = 'en'
);

-- Spanish welcome template
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(),
  w.id,
  'welcome',
  'es',
  'Bienvenida',
  'Bienvenidos a The Ceremony, {{{COUPLE_NAMES}}}!',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2>Bienvenidos, {{{COUPLE_NAMES}}}!</h2><p>Felicidades por su proxima boda! Estamos encantados de tenerlos en The Ceremony.</p><p>Aqui hay algunas cosas para comenzar:</p><ul><li>Agrega a tus invitados</li><li>Personaliza tu sitio de boda</li><li>Configura tu registro de regalos</li></ul><a href="{{{ADMIN_URL}}}" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;">Ir al Panel</a></div>',
  true,
  '[{"key":"COUPLE_NAMES","description":"Nombres de la pareja"},{"key":"ADMIN_URL","description":"URL al panel de administracion"},{"key":"APP_URL","description":"URL base de la aplicacion"}]'::jsonb,
  now(),
  now()
FROM weddings w
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et
  WHERE et.wedding_id = w.id AND et.type = 'welcome' AND et.language = 'es'
);
