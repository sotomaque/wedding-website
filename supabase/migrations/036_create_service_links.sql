-- Create service_links table for the Services & Links Manager feature
CREATE TABLE IF NOT EXISTS service_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('venue', 'catering', 'photography', 'music', 'flowers', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_links_wedding_id ON service_links(wedding_id);
CREATE INDEX IF NOT EXISTS idx_service_links_sort_order ON service_links(sort_order);

ALTER TABLE service_links ENABLE ROW LEVEL SECURITY;
-- No public read policy needed — public page uses service role via Kysely
