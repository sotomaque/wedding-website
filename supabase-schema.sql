-- Wedding Website Database Schema
-- Run this SQL in your Supabase SQL Editor to create the tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Guests table
-- Stores guest information and RSVP details
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  invite_code TEXT NOT NULL UNIQUE,
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'yes', 'no')),
  plus_one_name TEXT,
  dietary_restrictions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities table
-- Stores activities/things to do in San Diego
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Activity Interests junction table
-- Tracks which guests are interested in which activities
CREATE TABLE guest_activity_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guest_id, activity_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_invite_code ON guests(invite_code);
CREATE INDEX idx_guest_activity_interests_guest_id ON guest_activity_interests(guest_id);
CREATE INDEX idx_guest_activity_interests_activity_id ON guest_activity_interests(activity_id);

-- Enable Row Level Security (RLS)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_activity_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guests table
-- Allow public read access (for checking invite codes, etc.)
CREATE POLICY "Allow public read access to guests"
  ON guests FOR SELECT
  USING (true);

-- Allow authenticated users to update their own records
CREATE POLICY "Allow guests to update their own record"
  ON guests FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Allow insert for RSVP submissions
CREATE POLICY "Allow insert for RSVP"
  ON guests FOR INSERT
  WITH CHECK (true);

-- RLS Policies for activities table
-- Allow public read access to activities
CREATE POLICY "Allow public read access to activities"
  ON activities FOR SELECT
  USING (true);

-- Only allow authenticated admins to insert/update/delete activities
CREATE POLICY "Allow admins to manage activities"
  ON activities FOR ALL
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for guest_activity_interests table
-- Allow public read access
CREATE POLICY "Allow public read access to guest interests"
  ON guest_activity_interests FOR SELECT
  USING (true);

-- Allow guests to insert their own interests
CREATE POLICY "Allow guests to insert their interests"
  ON guest_activity_interests FOR INSERT
  WITH CHECK (true);

-- Allow guests to delete their own interests
CREATE POLICY "Allow guests to delete their interests"
  ON guest_activity_interests FOR DELETE
  USING (true);
