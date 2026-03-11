-- Migration: Update favorite beaches
-- This migration updates the beach activities to show Del Mar, Solana, Moonlight, and Cortado in order

-- First, let's update the display order and details for the beaches we want to keep
-- Del Mar Beach - display_order 1
UPDATE activities
SET
  name = 'Del Mar Beach',
  description = 'A pristine stretch of sand with dramatic cliffs and excellent surfing. One of our favorite spots to watch the sunset.',
  emoji = '🏖️',
  display_order = 1
WHERE name ILIKE '%del mar%' AND is_venue = FALSE;

-- Solana Beach - display_order 2
UPDATE activities
SET
  name = 'Solana Beach',
  description = 'A charming coastal community with beautiful beaches and a relaxed vibe. Perfect for a morning walk or afternoon swim.',
  emoji = '🌊',
  display_order = 2
WHERE name ILIKE '%solana%' AND is_venue = FALSE;

-- Moonlight Beach - display_order 3
UPDATE activities
SET
  name = 'Moonlight Beach',
  description = 'Family-friendly beach in Encinitas with volleyball courts, fire pits, and nearby restaurants. Great for a full beach day.',
  emoji = '🏄',
  image_url = '/things-to-do/moonlight.jpg',
  display_order = 3
WHERE name ILIKE '%moonlight%' AND is_venue = FALSE;

-- If any of these beaches don't exist yet, insert them
-- (This ensures the migration works even if the beaches haven't been added)

-- Insert Del Mar Beach if it doesn't exist
INSERT INTO activities (id, name, description, emoji, address, image_url, latitude, longitude, is_venue, venue_type, display_order, created_at)
SELECT
  gen_random_uuid(),
  'Del Mar Beach',
  'A pristine stretch of sand with dramatic cliffs and excellent surfing. One of our favorite spots to watch the sunset.',
  '🏖️',
  '1700 Coast Blvd, Del Mar, CA 92014',
  NULL,
  32.9595,
  -117.2656,
  FALSE,
  NULL,
  1,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM activities WHERE name ILIKE '%del mar%' AND is_venue = FALSE
);

-- Insert Solana Beach if it doesn't exist
INSERT INTO activities (id, name, description, emoji, address, image_url, latitude, longitude, is_venue, venue_type, display_order, created_at)
SELECT
  gen_random_uuid(),
  'Solana Beach',
  'A charming coastal community with beautiful beaches and a relaxed vibe. Perfect for a morning walk or afternoon swim.',
  '🌊',
  'Solana Beach, CA 92075',
  NULL,
  32.9911,
  -117.2713,
  FALSE,
  NULL,
  2,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM activities WHERE name ILIKE '%solana%' AND is_venue = FALSE
);

-- Insert Moonlight Beach if it doesn't exist
INSERT INTO activities (id, name, description, emoji, address, image_url, latitude, longitude, is_venue, venue_type, display_order, created_at)
SELECT
  gen_random_uuid(),
  'Moonlight Beach',
  'Family-friendly beach in Encinitas with volleyball courts, fire pits, and nearby restaurants. Great for a full beach day.',
  '🏄',
  '400 B St, Encinitas, CA 92024',
  '/things-to-do/moonlight.jpg',
  33.0454,
  -117.2920,
  FALSE,
  NULL,
  3,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM activities WHERE name ILIKE '%moonlight%' AND is_venue = FALSE
);
