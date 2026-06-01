-- Migration 068: Per-event share-preview image.
--
-- Optional image used for an event's public RSVP link preview (iMessage /
-- social). Uploaded via UploadThing or chosen from the photo gallery; when
-- unset, the preview falls back to a styled gradient card.

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
