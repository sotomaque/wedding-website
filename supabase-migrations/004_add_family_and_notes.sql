-- Migration: Add family and notes columns to guests table
-- Run this in Supabase SQL Editor

-- Add family and notes columns
ALTER TABLE guests
ADD COLUMN family BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN notes TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN guests.family IS 'Indicates if the guest is a family member (admin-only field)';
COMMENT ON COLUMN guests.notes IS 'Internal notes about the guest (admin-only field)';

-- Optional: Create a partial index on family for better query performance
-- Only indexes rows where family = true
CREATE INDEX idx_guests_family ON guests(family) WHERE family = true;
