-- Migration 064: Seed registry_claim_notification templates for existing
-- weddings (EN + ES). Idempotent. New weddings get these via getDefaultTemplates().

-- English
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'registry_claim_notification', 'en', 'Registry Claim Notification',
  'Gift claimed: {{{ITEM_TITLE}}}',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;"><h2 style="color:#667eea;">A gift was claimed</h2><p><strong>{{{CLAIMANT_NAME}}}</strong> ({{{CLAIMANT_EMAIL}}}) is giving:</p><div style="background:#f7f7f7;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:18px;font-weight:600;">{{{ITEM_TITLE}}}</p></div><p>It is now marked as taken on your registry, so no one else will give a duplicate.</p><a href="{{{ADMIN_URL}}}" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;">View registry</a></div>',
  true,
  '[{"key":"CLAIMANT_NAME","description":"Name of the guest who claimed the gift"},{"key":"CLAIMANT_EMAIL","description":"Email of the claimant"},{"key":"ITEM_TITLE","description":"Title of the claimed registry item"},{"key":"ADMIN_URL","description":"URL to the admin registry page"}]'::jsonb,
  now(), now()
FROM weddings w
WHERE NOT EXISTS (SELECT 1 FROM email_templates et WHERE et.wedding_id = w.id AND et.type = 'registry_claim_notification' AND et.language = 'en');

-- Spanish
INSERT INTO email_templates (id, wedding_id, type, language, name, subject, html_body, is_active, variables, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'registry_claim_notification', 'es', 'Notificacion de Regalo Reservado',
  'Regalo reservado: {{{ITEM_TITLE}}}',
  '<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;"><h2 style="color:#667eea;">Se reservo un regalo</h2><p><strong>{{{CLAIMANT_NAME}}}</strong> ({{{CLAIMANT_EMAIL}}}) va a regalar:</p><div style="background:#f7f7f7;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:18px;font-weight:600;">{{{ITEM_TITLE}}}</p></div><p>Ahora aparece como reservado en tu lista, para que nadie de un regalo duplicado.</p><a href="{{{ADMIN_URL}}}" style="display:inline-block;padding:12px 24px;background:#667eea;color:#fff;text-decoration:none;border-radius:6px;">Ver lista de regalos</a></div>',
  true,
  '[{"key":"CLAIMANT_NAME","description":"Nombre del invitado que reservo el regalo"},{"key":"CLAIMANT_EMAIL","description":"Correo del invitado"},{"key":"ITEM_TITLE","description":"Titulo del regalo reservado"},{"key":"ADMIN_URL","description":"URL a la pagina de regalos del admin"}]'::jsonb,
  now(), now()
FROM weddings w
WHERE NOT EXISTS (SELECT 1 FROM email_templates et WHERE et.wedding_id = w.id AND et.type = 'registry_claim_notification' AND et.language = 'es');
