-- Migration 043: Add theme_id column to weddings table.
-- Stores the ID of the selected theme preset (e.g., "warm-gold", "sage-garden").

ALTER TABLE weddings ADD COLUMN IF NOT EXISTS theme_id TEXT;

-- Default existing wedding to the warm-gold theme
UPDATE weddings SET theme_id = 'warm-gold' WHERE slug = 'helen-and-enrique';
