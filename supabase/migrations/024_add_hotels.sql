-- Migration: Add hotels and guest hotel interests tables
-- This migration creates the hotels recommendation system with guest interest tracking

-- Create hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  website_url TEXT,
  phone TEXT,
  image_url TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  hotel_type TEXT CHECK (hotel_type IN ('luxury', 'moderate', 'budget')),
  distance_to_venue TEXT,
  parking_info TEXT,
  amenities TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE hotels IS 'Recommended hotels for wedding guests';
COMMENT ON COLUMN hotels.name IS 'Hotel name';
COMMENT ON COLUMN hotels.description IS 'Brief description of the hotel';
COMMENT ON COLUMN hotels.address IS 'Full address of the hotel';
COMMENT ON COLUMN hotels.website_url IS 'Hotel website URL';
COMMENT ON COLUMN hotels.phone IS 'Hotel phone number';
COMMENT ON COLUMN hotels.image_url IS 'Path to hotel image in /public/hotels/';
COMMENT ON COLUMN hotels.latitude IS 'Latitude coordinate for map display';
COMMENT ON COLUMN hotels.longitude IS 'Longitude coordinate for map display';
COMMENT ON COLUMN hotels.hotel_type IS 'Category: luxury, moderate, or budget';
COMMENT ON COLUMN hotels.distance_to_venue IS 'Distance description (e.g., "across the street")';
COMMENT ON COLUMN hotels.parking_info IS 'Parking availability and cost information';
COMMENT ON COLUMN hotels.amenities IS 'Comma-separated list of amenities';
COMMENT ON COLUMN hotels.display_order IS 'Order in which hotels appear on the page';

-- Create guest hotel interests junction table
CREATE TABLE IF NOT EXISTS guest_hotel_interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('interested', 'booked')) NOT NULL,
  check_in_date DATE,
  check_out_date DATE,
  number_of_rooms INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guest_id, hotel_id)
);

-- Add comments
COMMENT ON TABLE guest_hotel_interests IS 'Tracks guest interest in specific hotels';
COMMENT ON COLUMN guest_hotel_interests.guest_id IS 'Foreign key to guests table';
COMMENT ON COLUMN guest_hotel_interests.hotel_id IS 'Foreign key to hotels table';
COMMENT ON COLUMN guest_hotel_interests.invite_code IS 'Guest invite code for non-authenticated access';
COMMENT ON COLUMN guest_hotel_interests.status IS 'Interest status: interested or booked';
COMMENT ON COLUMN guest_hotel_interests.check_in_date IS 'Planned check-in date';
COMMENT ON COLUMN guest_hotel_interests.check_out_date IS 'Planned check-out date';
COMMENT ON COLUMN guest_hotel_interests.number_of_rooms IS 'Number of rooms needed';
COMMENT ON COLUMN guest_hotel_interests.notes IS 'Additional notes from guest';

-- Add tracking columns to guests table
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS hotel_recommendation_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hotel_recommendation_email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS hotel_recommendation_email_resend_count INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN guests.hotel_recommendation_email_sent IS 'Whether hotel recommendations email has been sent';
COMMENT ON COLUMN guests.hotel_recommendation_email_sent_at IS 'Timestamp of last hotel email sent';
COMMENT ON COLUMN guests.hotel_recommendation_email_resend_count IS 'Number of times hotel email has been resent';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotels_display_order ON hotels(display_order);
CREATE INDEX IF NOT EXISTS idx_hotels_hotel_type ON hotels(hotel_type);
CREATE INDEX IF NOT EXISTS idx_guest_hotel_interests_guest_id ON guest_hotel_interests(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_hotel_interests_hotel_id ON guest_hotel_interests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_hotel_interests_invite_code ON guest_hotel_interests(invite_code);
CREATE INDEX IF NOT EXISTS idx_guest_hotel_interests_status ON guest_hotel_interests(status);

-- Seed hotels data
INSERT INTO hotels (id, name, description, address, website_url, latitude, longitude, distance_to_venue, hotel_type, display_order)
VALUES
  (
    gen_random_uuid(),
    'Manchester Grand Hyatt',
    'Luxury waterfront hotel with stunning bay views and multiple dining options. Features include spa, fitness center, and easy access to the Seaport District.',
    '1 Market Pl, San Diego, CA 92101',
    'https://www.hyatt.com/en-US/hotel/california/manchester-grand-hyatt-san-diego/sandt',
    32.7088,
    -117.1698,
    'across the street from venue',
    'luxury',
    0
  ),
  (
    gen_random_uuid(),
    'Embassy Suites by Hilton',
    'All-suite hotel offering spacious accommodations with complimentary breakfast and evening reception. Perfect for families and groups.',
    '601 Pacific Hwy, San Diego, CA 92101',
    'https://www.hilton.com/en/hotels/saneses-embassy-suites-san-diego-bay-downtown/',
    32.7173,
    -117.1698,
    'across the street from venue',
    'moderate',
    1
  ),
  (
    gen_random_uuid(),
    'Courtyard San Diego Gaslamp/Convention Center',
    'Modern hotel in the heart of the Gaslamp Quarter with easy access to downtown attractions, restaurants, and nightlife.',
    '453 6th Ave, San Diego, CA 92101',
    'https://www.marriott.com/en-us/hotels/sandc-courtyard-san-diego-gaslamp-convention-center/',
    32.7086,
    -117.1598,
    'less than a mile',
    'moderate',
    2
  ),
  (
    gen_random_uuid(),
    'Marriott Marquis San Diego Marina',
    'Twin-tower waterfront resort featuring multiple pools, restaurants, and a full-service spa. Ideal for a relaxing stay.',
    '333 W Harbor Dr, San Diego, CA 92101',
    'https://www.marriott.com/en-us/hotels/sanmc-marriott-marquis-san-diego-marina/',
    32.7086,
    -117.1698,
    'less than a mile',
    'luxury',
    3
  ),
  (
    gen_random_uuid(),
    'Le Pensione Hotel',
    'Charming European-style hotel in Little Italy offering cozy accommodations at great value. Walking distance to restaurants and cafes.',
    '606 W Date St, San Diego, CA 92101',
    'https://www.lapehotel.com/',
    32.7216,
    -117.1698,
    '1.1 miles away',
    'budget',
    4
  ),
  (
    gen_random_uuid(),
    'Omni San Diego Hotel',
    'Upscale hotel connected to PETCO Park with rooftop pool, elegant rooms, and exceptional service.',
    '675 L St, San Diego, CA 92101',
    'https://www.omnihotels.com/hotels/san-diego',
    32.7073,
    -117.1598,
    'less than a mile',
    'luxury',
    5
  ),
  (
    gen_random_uuid(),
    'Horton Grand Hotel',
    'Historic boutique hotel with Victorian charm in the heart of the Gaslamp Quarter. Unique character and personalized service.',
    '311 Island Ave, San Diego, CA 92101',
    'https://www.hortongrand.com/',
    32.7073,
    -117.1598,
    'less than a mile',
    'moderate',
    6
  ),
  (
    gen_random_uuid(),
    'Hilton San Diego Bayfront',
    'Contemporary waterfront hotel featuring panoramic bay views, waterfront dining, and direct access to the convention center.',
    '1 Park Blvd, San Diego, CA 92101',
    'https://www.hilton.com/en/hotels/sanbfhf-hilton-san-diego-bayfront/',
    32.7073,
    -117.1698,
    '1.0 miles away',
    'luxury',
    7
  )
ON CONFLICT DO NOTHING;

-- Update church information in activities table
UPDATE activities
SET
  name = 'St. Therese of Carmel Catholic Church',
  description = 'A beautiful modern church in the Carmel Valley area of San Diego. This serene and welcoming parish will be the setting for our ceremony.',
  address = '4355 Del Mar Trails Rd, San Diego, CA 92130',
  latitude = 32.9595,
  longitude = -117.2214
WHERE is_venue = TRUE AND venue_type = 'ceremony';

-- Update church information in events table if it exists
UPDATE events
SET
  location_name = 'St. Therese of Carmel Catholic Church',
  location_address = '4355 Del Mar Trails Rd, San Diego, CA 92130',
  latitude = 32.9595,
  longitude = -117.2214
WHERE name = 'Wedding Ceremony';
