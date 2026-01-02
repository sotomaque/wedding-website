-- Create photos table for storing uploaded gallery photos
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  alt TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering photos
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON photos(display_order);
CREATE INDEX IF NOT EXISTS idx_photos_is_active ON photos(is_active);

-- Add comments
COMMENT ON TABLE photos IS 'Gallery photos for the wedding website';
COMMENT ON COLUMN photos.url IS 'UploadThing URL for the photo';
COMMENT ON COLUMN photos.alt IS 'Alt text for accessibility';
COMMENT ON COLUMN photos.description IS 'Description shown in the gallery';
COMMENT ON COLUMN photos.display_order IS 'Order in which photos appear (lower = first)';
COMMENT ON COLUMN photos.is_active IS 'Whether the photo is visible on the website';
