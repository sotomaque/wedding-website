-- Migration: Add seating chart tables
-- Creates tables for seating charts, tables, and guest assignments

-- Seating Charts table (stores chart configurations)
CREATE TABLE IF NOT EXISTS seating_charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  default_seats_per_table INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seating Tables table (stores individual table definitions)
CREATE TABLE IF NOT EXISTS seating_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seating_chart_id UUID NOT NULL REFERENCES seating_charts(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  table_name TEXT,
  capacity_override INTEGER,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  shape TEXT DEFAULT 'round' CHECK (shape IN ('round', 'rectangle', 'square')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seating_chart_id, table_number)
);

-- Guest Table Assignments (junction table)
CREATE TABLE IF NOT EXISTS guest_table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seating_table_id UUID NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  seat_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(seating_table_id, guest_id),
  UNIQUE(guest_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seating_charts_is_active ON seating_charts(is_active);
CREATE INDEX IF NOT EXISTS idx_seating_tables_chart_id ON seating_tables(seating_chart_id);
CREATE INDEX IF NOT EXISTS idx_guest_table_assignments_table_id ON guest_table_assignments(seating_table_id);
CREATE INDEX IF NOT EXISTS idx_guest_table_assignments_guest_id ON guest_table_assignments(guest_id);

-- Add comments for documentation
COMMENT ON TABLE seating_charts IS 'Stores seating chart configurations';
COMMENT ON TABLE seating_tables IS 'Individual tables within a seating chart';
COMMENT ON TABLE guest_table_assignments IS 'Assigns guests to specific tables';
COMMENT ON COLUMN seating_tables.position_x IS 'X coordinate for visual editor canvas';
COMMENT ON COLUMN seating_tables.position_y IS 'Y coordinate for visual editor canvas';
COMMENT ON COLUMN seating_tables.capacity_override IS 'Override the default seats_per_table from the parent chart';
