-- Migration: Seed activities table with locations data
-- This populates the activities table with our favorite San Diego spots

-- First, add new columns to activities table for additional data
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS emoji TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS is_venue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS venue_type TEXT CHECK (venue_type IN ('ceremony', 'reception') OR venue_type IS NULL),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN activities.emoji IS 'Emoji icon for the activity';
COMMENT ON COLUMN activities.address IS 'Physical address of the location';
COMMENT ON COLUMN activities.image_url IS 'URL to the activity image';
COMMENT ON COLUMN activities.latitude IS 'Latitude coordinate for map display';
COMMENT ON COLUMN activities.longitude IS 'Longitude coordinate for map display';
COMMENT ON COLUMN activities.is_venue IS 'Whether this is a wedding venue (ceremony or reception)';
COMMENT ON COLUMN activities.venue_type IS 'Type of venue: ceremony or reception';
COMMENT ON COLUMN activities.display_order IS 'Order in which activities appear';

-- Insert venues first (ceremony and reception)
INSERT INTO activities (id, name, description, emoji, address, image_url, longitude, latitude, is_venue, venue_type, display_order)
VALUES
  (
    gen_random_uuid(),
    'The Immaculata',
    'A stunning example of Spanish Renaissance architecture, The Immaculata sits atop the University of San Diego campus with breathtaking views of Mission Bay. This beautiful church will be the setting for our ceremony.',
    '⛪️',
    '5998 Alcalá Park, San Diego, CA 92110',
    '/things-to-do/immaculata.jpg',
    -117.1902,
    32.7719,
    TRUE,
    'ceremony',
    0
  ),
  (
    gen_random_uuid(),
    'Headquarters at Seaport',
    'Located in the historic heart of downtown San Diego, The Headquarters at Seaport District is where we''ll celebrate with dinner, drinks, and dancing. This waterfront venue offers stunning bay views and a vibrant atmosphere.',
    '🍾',
    '789 W Harbor Dr, San Diego, CA 92101',
    '/things-to-do/headquarters.webp',
    -117.1689,
    32.7091,
    TRUE,
    'reception',
    1
  )
ON CONFLICT DO NOTHING;

-- Insert things to do locations
INSERT INTO activities (id, name, description, emoji, address, image_url, longitude, latitude, is_venue, display_order)
VALUES
  (
    gen_random_uuid(),
    'Balboa Park',
    'One of our favorite spots for a lazy Sunday stroll. The gardens are stunning, and there''s always something new to discover. Pro tip: grab coffee at the Japanese Friendship Garden!',
    '🌳',
    '1549 El Prado, San Diego, CA',
    '/things-to-do/balboa.png',
    -117.1496,
    32.7311,
    FALSE,
    10
  ),
  (
    gen_random_uuid(),
    'La Jolla Cove',
    'We love watching the sea lions here—they''re hilarious! The views are breathtaking, especially at sunset. Walk along the coastal path and you might spot some seals too.',
    '🦭',
    '500 Coast Blvd, La Jolla, CA',
    '/things-to-do/la-jolla-cove.webp',
    -117.2715,
    32.8507,
    FALSE,
    11
  ),
  (
    gen_random_uuid(),
    'Little Italy',
    'One of our favorite neighborhoods for an evening stroll. Amazing Italian restaurants, trendy cafes, and a wonderful Saturday farmers market. The vibe here is unbeatable!',
    '🇮🇹',
    'Little Italy, San Diego',
    '/things-to-do/little-italy.jpeg',
    -117.167,
    32.7212,
    FALSE,
    12
  ),
  (
    gen_random_uuid(),
    'Coronado Beach',
    'Hands down our favorite beach in San Diego. The sand sparkles (really!), the water is perfect, and the Hotel del Coronado is such an iconic spot for a sunset cocktail.',
    '🏖️',
    '1500 Orange Ave, Coronado',
    '/things-to-do/coronado.webp',
    -117.1783,
    32.6859,
    FALSE,
    13
  ),
  (
    gen_random_uuid(),
    'Del Mar Beach',
    'One of the most beautiful beaches in Southern California! The wide sandy shores are perfect for long walks, and the beach town has such a charming, laid-back vibe. Great for sunset watching!',
    '🌊',
    'Del Mar, CA',
    '/things-to-do/del-mar.jpg',
    -117.2652,
    32.9595,
    FALSE,
    14
  ),
  (
    gen_random_uuid(),
    'San Diego Zoo',
    'World-famous for a reason! We never get tired of visiting. The pandas are adorable, and the aerial tram gives you amazing views. Plan for at least half a day here!',
    '🦁',
    '2920 Zoo Drive, San Diego',
    '/things-to-do/sandiegozoo.jpg',
    -117.1509,
    32.7347,
    FALSE,
    15
  )
ON CONFLICT DO NOTHING;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_activities_display_order ON activities(display_order);
CREATE INDEX IF NOT EXISTS idx_activities_is_venue ON activities(is_venue);
