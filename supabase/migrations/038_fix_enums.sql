-- Migration 038: Fix enum conversions from 037
-- 037 silently failed for columns with DEFAULT values or trigger dependencies.
-- This migration properly handles: drop trigger → drop default → convert → re-add default → recreate trigger.
-- Idempotent: checks column type before converting, skips if already enum.

-- ============================================================
-- Create ENUM types (idempotent via duplicate_object catch)
-- ============================================================

DO $$ BEGIN CREATE TYPE rsvp_status AS ENUM ('pending', 'yes', 'no'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE guest_side AS ENUM ('bride', 'groom', 'both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE guest_list AS ENUM ('a', 'b', 'c'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gender AS ENUM ('male', 'female'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE preferred_contact_method AS ENUM ('email', 'text', 'whatsapp', 'phone_call'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE bridal_party_role AS ENUM ('groomsman', 'best_man', 'bridesmaid', 'maid_of_honor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE venue_type AS ENUM ('ceremony', 'reception'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE activity_interest_status AS ENUM ('interested', 'committed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE hotel_type AS ENUM ('luxury', 'moderate', 'budget'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE hotel_interest_status AS ENUM ('interested', 'booked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gift_type AS ENUM ('baby_fund', 'honeymoon', 'student_loans'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gift_status AS ENUM ('pending', 'completed', 'refunded', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE seating_shape AS ENUM ('round', 'rectangle', 'square'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE wedding_status AS ENUM ('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_category AS ENUM ('contract', 'receipt', 'floor_plan', 'timeline', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE service_link_category AS ENUM ('venue', 'catering', 'photography', 'music', 'flowers', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Drop triggers that reference columns being converted
-- ============================================================

DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;
DROP FUNCTION IF EXISTS cascade_guest_updates_to_plus_ones();

-- ============================================================
-- Drop CHECK constraints
-- ============================================================

ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_rsvp_status_check;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_side_check;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_list_check;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_gender_check;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_preferred_contact_method_check;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_bridal_party_role_check;
ALTER TABLE guests DROP CONSTRAINT IF EXISTS chk_bridal_party_gender;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_venue_type_check;
ALTER TABLE guest_activity_interests DROP CONSTRAINT IF EXISTS guest_activity_interests_status_check;
ALTER TABLE guest_event_invites DROP CONSTRAINT IF EXISTS guest_event_invites_rsvp_status_check;
ALTER TABLE hotels DROP CONSTRAINT IF EXISTS hotels_hotel_type_check;
ALTER TABLE guest_hotel_interests DROP CONSTRAINT IF EXISTS guest_hotel_interests_status_check;
ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_gift_type_check;
ALTER TABLE gifts DROP CONSTRAINT IF EXISTS gifts_status_check;
ALTER TABLE seating_tables DROP CONSTRAINT IF EXISTS seating_tables_shape_check;
ALTER TABLE weddings DROP CONSTRAINT IF EXISTS weddings_status_check;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE service_links DROP CONSTRAINT IF EXISTS service_links_category_check;
ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_side_check;
ALTER TABLE parties DROP CONSTRAINT IF EXISTS parties_list_check;

-- ============================================================
-- Convert columns: drop default → alter type → re-add default
-- Wrapped in a single DO block; skips columns already converted
-- ============================================================

DO $$
DECLARE
  col_type text;
BEGIN
  -- Helper: check if a column is still text/varchar (not yet converted)
  -- guests.rsvp_status
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'rsvp_status';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guests ALTER COLUMN rsvp_status DROP DEFAULT;
    ALTER TABLE guests ALTER COLUMN rsvp_status TYPE rsvp_status USING rsvp_status::rsvp_status;
    ALTER TABLE guests ALTER COLUMN rsvp_status SET DEFAULT 'pending'::rsvp_status;
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'side';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guests ALTER COLUMN side TYPE guest_side USING side::guest_side;
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'list';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guests ALTER COLUMN list DROP DEFAULT;
    ALTER TABLE guests ALTER COLUMN list TYPE guest_list USING list::guest_list;
    ALTER TABLE guests ALTER COLUMN list SET DEFAULT 'a'::guest_list;
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'gender';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guests ALTER COLUMN gender TYPE gender USING gender::gender;
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'preferred_contact_method';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guests ALTER COLUMN preferred_contact_method TYPE preferred_contact_method USING preferred_contact_method::preferred_contact_method;
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'bridal_party_role';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guests ALTER COLUMN bridal_party_role TYPE bridal_party_role USING bridal_party_role::bridal_party_role;
  END IF;

  -- activities.venue_type
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'venue_type';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE activities ALTER COLUMN venue_type TYPE venue_type USING venue_type::venue_type;
  END IF;

  -- guest_activity_interests.status
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guest_activity_interests' AND column_name = 'status';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guest_activity_interests ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE guest_activity_interests ALTER COLUMN status TYPE activity_interest_status USING status::activity_interest_status;
    ALTER TABLE guest_activity_interests ALTER COLUMN status SET DEFAULT 'interested'::activity_interest_status;
  END IF;

  -- guest_event_invites.rsvp_status
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guest_event_invites' AND column_name = 'rsvp_status';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guest_event_invites ALTER COLUMN rsvp_status DROP DEFAULT;
    ALTER TABLE guest_event_invites ALTER COLUMN rsvp_status TYPE rsvp_status USING rsvp_status::rsvp_status;
    ALTER TABLE guest_event_invites ALTER COLUMN rsvp_status SET DEFAULT 'pending'::rsvp_status;
  END IF;

  -- hotels.hotel_type
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'hotels' AND column_name = 'hotel_type';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE hotels ALTER COLUMN hotel_type TYPE hotel_type USING hotel_type::hotel_type;
  END IF;

  -- guest_hotel_interests.status
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'guest_hotel_interests' AND column_name = 'status';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE guest_hotel_interests ALTER COLUMN status TYPE hotel_interest_status USING status::hotel_interest_status;
  END IF;

  -- gifts.gift_type
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'gifts' AND column_name = 'gift_type';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE gifts ALTER COLUMN gift_type TYPE gift_type USING gift_type::gift_type;
  END IF;

  -- gifts.status
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'gifts' AND column_name = 'status';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE gifts ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE gifts ALTER COLUMN status TYPE gift_status USING status::gift_status;
    ALTER TABLE gifts ALTER COLUMN status SET DEFAULT 'completed'::gift_status;
  END IF;

  -- seating_tables.shape
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'seating_tables' AND column_name = 'shape';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE seating_tables ALTER COLUMN shape DROP DEFAULT;
    ALTER TABLE seating_tables ALTER COLUMN shape TYPE seating_shape USING shape::seating_shape;
    ALTER TABLE seating_tables ALTER COLUMN shape SET DEFAULT 'round'::seating_shape;
  END IF;

  -- weddings.status
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'weddings' AND column_name = 'status';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE weddings ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE weddings ALTER COLUMN status TYPE wedding_status USING status::wedding_status;
    ALTER TABLE weddings ALTER COLUMN status SET DEFAULT 'published'::wedding_status;
  END IF;

  -- documents.category
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'category';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE documents ALTER COLUMN category DROP DEFAULT;
    ALTER TABLE documents ALTER COLUMN category TYPE document_category USING category::document_category;
    ALTER TABLE documents ALTER COLUMN category SET DEFAULT 'other'::document_category;
  END IF;

  -- service_links.category
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'service_links' AND column_name = 'category';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE service_links ALTER COLUMN category DROP DEFAULT;
    ALTER TABLE service_links ALTER COLUMN category TYPE service_link_category USING category::service_link_category;
    ALTER TABLE service_links ALTER COLUMN category SET DEFAULT 'other'::service_link_category;
  END IF;

  -- parties.side
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'parties' AND column_name = 'side';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE parties ALTER COLUMN side TYPE guest_side USING side::guest_side;
  END IF;

  -- parties.list
  SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name = 'parties' AND column_name = 'list';
  IF col_type IN ('text', 'character varying') THEN
    ALTER TABLE parties ALTER COLUMN list TYPE guest_list USING list::guest_list;
  END IF;
END $$;

-- ============================================================
-- Recreate trigger + function with enum-compatible types
-- ============================================================

CREATE OR REPLACE FUNCTION cascade_guest_updates_to_plus_ones()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.list IS DISTINCT FROM NEW.list)
     OR (OLD.family IS DISTINCT FROM NEW.family)
     OR (OLD.under_21 IS DISTINCT FROM NEW.under_21) THEN
    UPDATE guests
    SET
      list = NEW.list,
      family = NEW.family,
      under_21 = NEW.under_21
    WHERE primary_guest_id = NEW.id
      AND is_plus_one = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cascade_to_plus_ones ON guests;
CREATE TRIGGER trigger_cascade_to_plus_ones
  AFTER UPDATE ON guests
  FOR EACH ROW
  WHEN (OLD.list IS DISTINCT FROM NEW.list
        OR OLD.family IS DISTINCT FROM NEW.family
        OR OLD.under_21 IS DISTINCT FROM NEW.under_21)
  EXECUTE FUNCTION cascade_guest_updates_to_plus_ones();

-- ============================================================
-- Create implicit casts from text → enum so plain string
-- literals work in INSERT/UPDATE without explicit ::cast.
-- This keeps seed.sql and application code clean.
-- ============================================================

DO $$
DECLARE
  enum_name text;
  enum_oid oid;
BEGIN
  FOR enum_name IN
    SELECT unnest(ARRAY[
      'rsvp_status', 'guest_side', 'guest_list', 'gender',
      'preferred_contact_method', 'bridal_party_role', 'venue_type',
      'activity_interest_status', 'hotel_type', 'hotel_interest_status',
      'gift_type', 'gift_status', 'seating_shape', 'wedding_status',
      'document_category', 'service_link_category'
    ])
  LOOP
    -- Get the enum's OID to find its input function
    SELECT t.oid INTO enum_oid FROM pg_type t WHERE t.typname = enum_name;
    -- Create implicit cast using the enum's built-in input function (no recursion)
    BEGIN
      EXECUTE format(
        'CREATE CAST (text AS %s) WITH INOUT AS IMPLICIT',
        enum_name
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
