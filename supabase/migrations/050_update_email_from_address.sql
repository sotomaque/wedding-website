-- Migration 050: Update email from addresses to use theceremony.app domain
-- Sets emailFromAddress to {slug}@theceremony.app for all weddings.
-- Idempotent: only updates weddings not already on theceremony.app.

UPDATE weddings
SET email_from_address = slug || '@theceremony.app'
WHERE email_from_address IS NULL
   OR email_from_address NOT LIKE '%@theceremony.app';
