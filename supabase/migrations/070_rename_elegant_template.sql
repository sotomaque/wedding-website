-- Migration 070: The second template was renamed from "lovebird-elegant" to
-- "elegant" in app code (dropping a third-party brand name). Update any stored
-- template_id so existing weddings keep resolving to the same preset instead of
-- falling back to "classic".
UPDATE weddings SET template_id = 'elegant' WHERE template_id = 'lovebird-elegant';

-- The matching font pairing was renamed too: the script trio's id went from
-- "lovebird-elegant" to "elegant-script" (a separate "elegant" pairing already
-- existed). Fix any stored font override so it doesn't fall back to Classic.
UPDATE weddings
SET design_config = jsonb_set(design_config, '{fontId}', '"elegant-script"')
WHERE design_config->>'fontId' = 'lovebird-elegant';
