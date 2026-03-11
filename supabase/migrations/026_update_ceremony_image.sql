-- Migration: Update ceremony venue image
-- This migration updates the image URL for the ceremony venue from Immaculata to St. Therese

UPDATE activities
SET image_url = '/things-to-do/st-therese.webp'
WHERE is_venue = TRUE AND venue_type = 'ceremony';
