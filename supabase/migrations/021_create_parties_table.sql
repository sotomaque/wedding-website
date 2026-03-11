-- Migration 021: Create parties table for grouping guests
-- This replaces implicit invite_code-based grouping with explicit party records

-- Create parties table
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255),
  side VARCHAR(20) CHECK (side IN ('bride', 'groom', 'both')),
  list VARCHAR(20) CHECK (list IN ('a', 'b', 'c')),
  family VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add party_id to guests (nullable initially for migration)
ALTER TABLE guests ADD COLUMN party_id UUID REFERENCES parties(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX idx_guests_party_id ON guests(party_id);
CREATE INDEX idx_parties_invite_code ON parties(invite_code);

-- Add updated_at trigger for parties table
CREATE OR REPLACE FUNCTION update_parties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW
  EXECUTE FUNCTION update_parties_updated_at();

-- Enable RLS on parties table
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (admin access)
CREATE POLICY "Enable all access for authenticated users" ON parties
  FOR ALL
  USING (true)
  WITH CHECK (true);
