-- Migration: Add notes column to gifts table
-- Allows adding internal notes about gifts for admin tracking

ALTER TABLE gifts ADD COLUMN notes TEXT;

COMMENT ON COLUMN gifts.notes IS 'Internal admin notes about this gift';
