-- Migration 040: Add per-wedding configuration columns, content table, and registry items table.
-- Supports multi-tenancy by moving hardcoded constants and env vars to the database.

-- 1. Add new columns to weddings table
ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS notification_emails TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name TEXT,
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS person1_name TEXT,
  ADD COLUMN IF NOT EXISTS person2_name TEXT,
  ADD COLUMN IF NOT EXISTS brand_image_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_image_alt TEXT,
  ADD COLUMN IF NOT EXISTS feature_toggles JSONB NOT NULL DEFAULT '{}';

-- 2. Create wedding_content table
CREATE TABLE IF NOT EXISTS wedding_content (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  section    TEXT NOT NULL,
  content    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wedding_id, section)
);

CREATE INDEX IF NOT EXISTS idx_wedding_content_wedding_id ON wedding_content(wedding_id);
ALTER TABLE wedding_content ENABLE ROW LEVEL SECURITY;

-- 3. Create registry_items table
CREATE TABLE IF NOT EXISTS registry_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id        UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  image_url         TEXT,
  emoji             TEXT,
  stripe_url        TEXT,
  stripe_product_id TEXT,
  display_order     INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registry_items_wedding_order ON registry_items(wedding_id, display_order);
ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;

-- 4. Add registry_item_id FK to gifts table
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS registry_item_id UUID REFERENCES registry_items(id);
CREATE INDEX IF NOT EXISTS idx_gifts_registry_item_id ON gifts(registry_item_id);

-- 5. Seed existing helen-and-enrique wedding with new config
UPDATE weddings SET
  contact_email = 'sotomaque@gmail.com',
  notification_emails = 'sotomaque@gmail.com,helenespinoza986@gmail.com',
  email_from_name = 'Helen & Enrique',
  email_from_address = 'rsvp@helen-and-enrique.com',
  person1_name = 'Helen',
  person2_name = 'Enrique',
  brand_image_url = '/nav.png',
  brand_image_alt = 'H & E',
  feature_toggles = '{"hotels": true, "vendors": true, "thingsToDo": true, "tripPlanner": true, "registry": true, "guestPhotos": true, "slideshow": true}'::jsonb
WHERE slug = 'helen-and-enrique';

-- 6. Seed wedding_content for helen-and-enrique
INSERT INTO wedding_content (wedding_id, section, content)
SELECT w.id, v.section, v.content::jsonb
FROM weddings w
CROSS JOIN (VALUES
  ('hero', '{"title": "Helen & Enrique"}'),
  ('story', '{"title": "Our Story", "subtitle": "Mount Soledad", "subtitleCaption": "Views from Mount Soledad", "paragraphs": ["We met in Seattle in 2020, just before the world changed. What began as a simple connection quickly grew into something steady and meaningful, and we decided to start our journey together right then.", "That journey soon took us to Hawai''i, where Helen began her career as a teacher and where we learned what it meant to build a life side by side. From there, our path led us to San Diego, a place we are proud to now call home.", "Today, we''re so excited to celebrate our love with the people who mean the most to us. Join us as we begin this next chapter together, surrounded by joy, laughter, and unforgettable memories."], "photos": [{"src": "/our-photos/keller.jpeg", "alt": "Keller", "caption": "Memories in Keller"}, {"src": "/our-photos/haleiwa.jpeg", "alt": "Haleiwa", "caption": "North Shore vibes in Haleiwa"}]}'),
  ('details', '{"title": "Wedding Details", "dateFormatted": "Thursday, July 30, 2026", "ceremony": {"icon": "⛪️", "title": "Ceremony", "time": "4:00 PM", "venue": "St. Therese of Carmel Catholic Church", "location": "Carmel Valley, San Diego", "address": "4355 Del Mar Trails Rd, San Diego, CA 92130"}, "reception": {"icon": "🍾", "title": "Reception", "time": "6:00 PM", "venue": "Headquarters", "address": "789 W Harbor Dr Suite 148, San Diego, CA 92101", "description": "Dinner, Dancing & Celebration"}, "additionalInfo": [{"title": "Attire", "description": "Formal / Black Tie Optional"}, {"title": "Accommodations", "description": "Hotel blocks available"}]}'),
  ('schedule', '{"title": "Schedule", "events": [{"id": "arrival", "time": "3:30 PM", "event": "Guest Arrival", "description": "Please arrive early to find your seats"}, {"id": "ceremony", "time": "4:00 PM", "event": "Ceremony Begins", "description": "The celebration starts"}, {"id": "cocktail", "time": "4:30 PM", "event": "Cocktail Hour", "description": "Drinks and hors d''oeuvres in the garden"}, {"id": "reception", "time": "6:00 PM", "event": "Reception", "description": "Dinner, toasts, and dancing"}, {"id": "last-dance", "time": "10:00 PM", "event": "Last Dance", "description": "Send off under the stars"}]}'),
  ('rsvp', '{"title": "RSVP", "deadline": "Please respond by March 1, 2026"}')
) AS v(section, content)
WHERE w.slug = 'helen-and-enrique'
ON CONFLICT (wedding_id, section) DO NOTHING;

-- 7. Seed registry_items for helen-and-enrique
-- Note: stripe_url and stripe_product_id must be set manually from env vars after migration
INSERT INTO registry_items (wedding_id, title, description, image_url, emoji, display_order)
SELECT w.id, v.title, v.description, v.image_url, v.emoji, v.display_order
FROM weddings w
CROSS JOIN (VALUES
  ('Future Tiny Humans Fund', 'We''re not pregnant—just planners. Help us prepare for the chaos ahead.', '/registry/future-babies.jpg', '👶', 0),
  ('Send Us Somewhere Pretty', 'Fund our first adventure as a married couple—drinks with little umbrellas included.', '/registry/honeymoon.jpg', '✈️', 1),
  ('Bye Bye Student Loans', 'Contribute to our ''Sallie Mae Freedom Fund''.', '/registry/student-loan-relief.jpg', '🎓', 2)
) AS v(title, description, image_url, emoji, display_order)
WHERE w.slug = 'helen-and-enrique'
ON CONFLICT DO NOTHING;
