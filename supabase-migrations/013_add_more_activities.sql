-- Migration: Add more activities (beaches and theme parks)
-- This adds additional activities to the list

INSERT INTO activities (id, name, description, emoji, address, image_url, longitude, latitude, is_venue, display_order)
VALUES
  (
    gen_random_uuid(),
    'Solana Beach',
    'A hidden gem just north of San Diego! We love the relaxed atmosphere and the beautiful tide pools at Fletcher Cove. Perfect for a peaceful beach day away from the crowds.',
    '🏄',
    'Solana Beach, CA',
    '/things-to-do/solana-beach.webp',
    -117.2712,
    32.9912,
    FALSE,
    16
  ),
  (
    gen_random_uuid(),
    'Disneyland',
    'The Happiest Place on Earth is just a short drive away! We love escaping to the magic of Disneyland for a day of rides, treats, and nostalgia. Don''t miss the fireworks!',
    '🏰',
    '1313 Disneyland Dr, Anaheim, CA 92802',
    '/things-to-do/disneyland.jpg',
    -117.9190,
    33.8121,
    FALSE,
    20
  ),
  (
    gen_random_uuid(),
    'Universal Studios Hollywood',
    'Another one of our favorite day trips! The Wizarding World of Harry Potter is incredible, and the studio tour is so fun. Perfect for movie lovers!',
    '🎬',
    '100 Universal City Plaza, Universal City, CA 91608',
    '/things-to-do/universal.webp',
    -118.3533,
    34.1381,
    FALSE,
    21
  ),
  (
    gen_random_uuid(),
    'LEGOLAND California',
    'Located right here in Carlsbad! Whether you''re a kid or just a kid at heart, LEGOLAND is a blast. The miniland USA is incredibly detailed and the rides are fun for all ages.',
    '🧱',
    '1 Legoland Dr, Carlsbad, CA 92008',
    '/things-to-do/legoland.jpg',
    -117.3114,
    33.1264,
    FALSE,
    22
  ),
  (
    gen_random_uuid(),
    'SeaWorld San Diego',
    'A San Diego classic! We love the aquarium exhibits and the thrill rides. The rescue programs here do amazing work for marine life. Great for a fun family day out!',
    '🐬',
    '500 SeaWorld Dr, San Diego, CA 92109',
    '/things-to-do/seaworld.jpg',
    -117.2265,
    32.7647,
    FALSE,
    23
  )
ON CONFLICT DO NOTHING;
