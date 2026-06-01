-- Migration 061: Add an optional external registry wishlist URL to weddings.
-- Shown at the top of the public registry page (e.g. an Amazon wishlist link).
-- Nullable; existing weddings simply have no wishlist link until they set one.

ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS registry_wishlist_url TEXT;
