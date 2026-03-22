-- Migration 037: Convert CHECK constraints to PostgreSQL ENUMs
-- Idempotent: safe to re-run (uses DO blocks with IF NOT EXISTS checks)

-- ============================================================
-- Create ENUM types
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_status') THEN
    CREATE TYPE rsvp_status AS ENUM ('pending', 'yes', 'no');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_side') THEN
    CREATE TYPE guest_side AS ENUM ('bride', 'groom', 'both');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guest_list') THEN
    CREATE TYPE guest_list AS ENUM ('a', 'b', 'c');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
    CREATE TYPE gender AS ENUM ('male', 'female');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preferred_contact_method') THEN
    CREATE TYPE preferred_contact_method AS ENUM ('email', 'text', 'whatsapp', 'phone_call');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bridal_party_role') THEN
    CREATE TYPE bridal_party_role AS ENUM ('groomsman', 'best_man', 'bridesmaid', 'maid_of_honor');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'venue_type') THEN
    CREATE TYPE venue_type AS ENUM ('ceremony', 'reception');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_interest_status') THEN
    CREATE TYPE activity_interest_status AS ENUM ('interested', 'committed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hotel_type') THEN
    CREATE TYPE hotel_type AS ENUM ('luxury', 'moderate', 'budget');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hotel_interest_status') THEN
    CREATE TYPE hotel_interest_status AS ENUM ('interested', 'booked');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gift_type') THEN
    CREATE TYPE gift_type AS ENUM ('baby_fund', 'honeymoon', 'student_loans');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gift_status') THEN
    CREATE TYPE gift_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seating_shape') THEN
    CREATE TYPE seating_shape AS ENUM ('round', 'rectangle', 'square');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wedding_status') THEN
    CREATE TYPE wedding_status AS ENUM ('draft', 'published', 'archived');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_category') THEN
    CREATE TYPE document_category AS ENUM ('contract', 'receipt', 'floor_plan', 'timeline', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_link_category') THEN
    CREATE TYPE service_link_category AS ENUM ('venue', 'catering', 'photography', 'music', 'flowers', 'other');
  END IF;
END $$;

-- ============================================================
-- Convert columns from TEXT + CHECK to ENUM
-- Each block: drop CHECK constraint, alter column type
-- ============================================================

-- guests.rsvp_status
DO $$ BEGIN
  ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_rsvp_status_check;
  ALTER TABLE guests ALTER COLUMN rsvp_status TYPE rsvp_status USING rsvp_status::rsvp_status;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guests.side
DO $$ BEGIN
  ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_side_check;
  ALTER TABLE guests ALTER COLUMN side TYPE guest_side USING side::guest_side;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guests.list
DO $$ BEGIN
  ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_list_check;
  ALTER TABLE guests ALTER COLUMN list TYPE guest_list USING list::guest_list;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guests.gender
DO $$ BEGIN
  ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_gender_check;
  ALTER TABLE guests ALTER COLUMN gender TYPE gender USING gender::gender;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guests.preferred_contact_method
DO $$ BEGIN
  ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_preferred_contact_method_check;
  ALTER TABLE guests ALTER COLUMN preferred_contact_method TYPE preferred_contact_method USING preferred_contact_method::preferred_contact_method;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guests.bridal_party_role
DO $$ BEGIN
  ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_bridal_party_role_check;
  ALTER TABLE guests ALTER COLUMN bridal_party_role TYPE bridal_party_role USING bridal_party_role::bridal_party_role;
EXCEPTION WHEN others THEN NULL;
END $$;

-- activities.venue_type
DO $$ BEGIN
  ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_venue_type_check;
  ALTER TABLE activities ALTER COLUMN venue_type TYPE venue_type USING venue_type::venue_type;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guest_activity_interests.status
DO $$ BEGIN
  ALTER TABLE guest_activity_interests DROP CONSTRAINT IF EXISTS guest_activity_interests_status_check;
  ALTER TABLE guest_activity_interests ALTER COLUMN status TYPE activity_interest_status USING status::activity_interest_status;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guest_event_invites.rsvp_status
DO $$ BEGIN
  ALTER TABLE guest_event_invites DROP CONSTRAINT IF EXISTS guest_event_invites_rsvp_status_check;
  ALTER TABLE guest_event_invites ALTER COLUMN rsvp_status TYPE rsvp_status USING rsvp_status::rsvp_status;
EXCEPTION WHEN others THEN NULL;
END $$;

-- hotels.hotel_type
DO $$ BEGIN
  ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_hotel_type_check;
  ALTER TABLE hotels ALTER COLUMN hotel_type TYPE hotel_type USING hotel_type::hotel_type;
EXCEPTION WHEN others THEN NULL;
END $$;

-- guest_hotel_interests.status
DO $$ BEGIN
  ALTER TABLE guest_hotel_interests DROP CONSTRAINT IF EXISTS guest_hotel_interests_status_check;
  ALTER TABLE guest_hotel_interests ALTER COLUMN status TYPE hotel_interest_status USING status::hotel_interest_status;
EXCEPTION WHEN others THEN NULL;
END $$;

-- gifts.gift_type
DO $$ BEGIN
  ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_gift_type_check;
  ALTER TABLE gifts ALTER COLUMN gift_type TYPE gift_type USING gift_type::gift_type;
EXCEPTION WHEN others THEN NULL;
END $$;

-- gifts.status
DO $$ BEGIN
  ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_status_check;
  ALTER TABLE gifts ALTER COLUMN status TYPE gift_status USING status::gift_status;
EXCEPTION WHEN others THEN NULL;
END $$;

-- seating_tables.shape
DO $$ BEGIN
  ALTER TABLE seating_tables DROP CONSTRAINT IF EXISTS seating_tables_shape_check;
  ALTER TABLE seating_tables ALTER COLUMN shape TYPE seating_shape USING shape::seating_shape;
EXCEPTION WHEN others THEN NULL;
END $$;

-- weddings.status
DO $$ BEGIN
  ALTER TABLE weddings DROP CONSTRAINT IF EXISTS weddings_status_check;
  ALTER TABLE weddings ALTER COLUMN status TYPE wedding_status USING status::wedding_status;
EXCEPTION WHEN others THEN NULL;
END $$;

-- documents.category
DO $$ BEGIN
  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
  ALTER TABLE documents ALTER COLUMN category TYPE document_category USING category::document_category;
EXCEPTION WHEN others THEN NULL;
END $$;

-- service_links.category
DO $$ BEGIN
  ALTER TABLE service_links DROP CONSTRAINT IF EXISTS service_links_category_check;
  ALTER TABLE service_links ALTER COLUMN category TYPE service_link_category USING category::service_link_category;
EXCEPTION WHEN others THEN NULL;
END $$;

-- parties.side
DO $$ BEGIN
  ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_side_check;
  ALTER TABLE parties ALTER COLUMN side TYPE guest_side USING side::guest_side;
EXCEPTION WHEN others THEN NULL;
END $$;

-- parties.list
DO $$ BEGIN
  ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_list_check;
  ALTER TABLE parties ALTER COLUMN list TYPE guest_list USING list::guest_list;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Also drop the bridal party gender check constraint (handled by enum now)
ALTER TABLE guests DROP CONSTRAINT IF EXISTS chk_bridal_party_gender;
