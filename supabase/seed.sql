-- =============================================================================
-- Seed data for local development
-- Runs automatically after migrations on `supabase db reset`.
-- Provides realistic data so the app isn't empty when running locally.
-- =============================================================================

-- Get the default wedding ID (created by migration 032)
DO $$
DECLARE
  w_id UUID;
  -- Party IDs
  p_smith UUID := gen_random_uuid();
  p_garcia UUID := gen_random_uuid();
  p_johnson UUID := gen_random_uuid();
  p_kim UUID := gen_random_uuid();
  p_wilson UUID := gen_random_uuid();
  p_chen UUID := gen_random_uuid();
  p_taylor UUID := gen_random_uuid();
  p_brown UUID := gen_random_uuid();
  -- Guest IDs
  g_james UUID := gen_random_uuid();
  g_sarah UUID := gen_random_uuid();
  g_mike UUID := gen_random_uuid();
  g_lisa UUID := gen_random_uuid();
  g_luis UUID := gen_random_uuid();
  g_maria UUID := gen_random_uuid();
  g_david UUID := gen_random_uuid();
  g_emily UUID := gen_random_uuid();
  g_tom UUID := gen_random_uuid();
  g_rachel UUID := gen_random_uuid();
  g_ben UUID := gen_random_uuid();
  g_sophie UUID := gen_random_uuid();
  g_sophie_plus UUID := gen_random_uuid();
  g_alex UUID := gen_random_uuid();
  g_nina UUID := gen_random_uuid();
  g_chris UUID := gen_random_uuid();
  g_jessica UUID := gen_random_uuid();
  g_max UUID := gen_random_uuid();
  -- Event IDs
  ev_ceremony UUID := gen_random_uuid();
  ev_reception UUID := gen_random_uuid();
  ev_rehearsal UUID := gen_random_uuid();
  -- Hotel IDs
  h_del UUID := gen_random_uuid();
  h_marriott UUID := gen_random_uuid();
  h_hilton UUID := gen_random_uuid();
  -- Seating chart IDs
  sc_main UUID := gen_random_uuid();
  st_1 UUID := gen_random_uuid();
  st_2 UUID := gen_random_uuid();
  st_3 UUID := gen_random_uuid();
BEGIN
  SELECT id INTO w_id FROM weddings WHERE slug = 'helen-and-enrique';

  -- =========================================================================
  -- Parties
  -- =========================================================================
  INSERT INTO parties (id, invite_code, name, side, list, family, notes, wedding_id) VALUES
    (p_smith,   'SMTH-2026', 'Smith Family',     'bride', 'a', 'Smith',   NULL, w_id),
    (p_garcia,  'GARC-2026', 'Garcia Family',    'groom', 'a', 'Garcia',  NULL, w_id),
    (p_johnson, 'JOHN-2026', 'Johnson Party',    'bride', 'a', NULL,      'College friends', w_id),
    (p_kim,     'KIM0-2026', 'Kim Party',        'groom', 'a', NULL,      'Work colleagues', w_id),
    (p_wilson,  'WILS-2026', 'Wilson Party',     'bride', 'b', NULL,      NULL, w_id),
    (p_chen,    'CHEN-2026', 'Chen Party',       'groom', 'b', NULL,      NULL, w_id),
    (p_taylor,  'TAYL-2026', 'Taylor Party',     'both',  'a', NULL,      'Mutual friends', w_id),
    (p_brown,   'BRWN-2026', 'Brown Party',      'bride', 'c', NULL,      'Neighborhood friends', w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Guests (18 guests across 8 parties, mix of RSVP statuses)
  -- =========================================================================
  INSERT INTO guests (id, first_name, last_name, email, invite_code, rsvp_status, plus_one_allowed,
    dietary_restrictions, side, list, is_plus_one, primary_guest_id, number_of_resends,
    mailing_address, physical_invite_sent, phone_number, whatsapp, preferred_contact_method,
    family, under_21, three_and_under, gender, bridal_party_role, party_id, wedding_id) VALUES
    -- Smith Family (bride side, A-list, RSVP yes)
    (g_james, 'James', 'Smith', 'james.smith@example.com', 'SMTH-2026', 'yes', false,
      NULL, 'bride', 'a', false, NULL, 1,
      '123 Oak Lane, San Diego, CA 92101', true, '619-555-0101', NULL, 'email',
      true, false, false, 'male', NULL, p_smith, w_id),
    (g_sarah, 'Sarah', 'Smith', 'sarah.smith@example.com', 'SMTH-2026', 'yes', false,
      'Vegetarian', 'bride', 'a', false, NULL, 1,
      '123 Oak Lane, San Diego, CA 92101', true, '619-555-0102', NULL, 'email',
      true, false, false, 'female', NULL, p_smith, w_id),
    (g_max, 'Max', 'Smith', NULL, 'SMTH-2026', 'yes', false,
      NULL, 'bride', 'a', false, NULL, 0,
      NULL, false, NULL, NULL, NULL,
      true, true, false, 'male', NULL, p_smith, w_id),

    -- Garcia Family (groom side, A-list, RSVP yes)
    (g_mike, 'Miguel', 'Garcia', 'miguel.garcia@example.com', 'GARC-2026', 'yes', false,
      NULL, 'groom', 'a', false, NULL, 1,
      '456 Elm St, La Jolla, CA 92037', true, '858-555-0201', '858-555-0201', 'whatsapp',
      true, false, false, 'male', 'groomsman', p_garcia, w_id),
    (g_lisa, 'Lisa', 'Garcia', 'lisa.garcia@example.com', 'GARC-2026', 'yes', false,
      'Gluten-free', 'groom', 'a', false, NULL, 1,
      '456 Elm St, La Jolla, CA 92037', true, '858-555-0202', NULL, 'text',
      true, false, false, 'female', NULL, p_garcia, w_id),
    (g_luis, 'Luis', 'Garcia', NULL, 'GARC-2026', 'yes', false,
      NULL, 'groom', 'a', false, NULL, 0,
      NULL, false, NULL, NULL, NULL,
      true, false, true, 'male', NULL, p_garcia, w_id),

    -- Johnson Party (bride side, A-list, RSVP pending)
    (g_david, 'David', 'Johnson', 'david.j@example.com', 'JOHN-2026', 'pending', true,
      NULL, 'bride', 'a', false, NULL, 2,
      '789 Pine Ave, Encinitas, CA 92024', true, '760-555-0301', NULL, 'email',
      false, false, false, 'male', NULL, p_johnson, w_id),

    -- Kim Party (groom side, A-list, RSVP yes)
    (g_emily, 'Emily', 'Kim', 'emily.kim@example.com', 'KIM0-2026', 'yes', false,
      'Nut allergy', 'groom', 'a', false, NULL, 1,
      '321 Maple Dr, Del Mar, CA 92014', true, '858-555-0401', NULL, 'email',
      false, false, false, 'female', 'bridesmaid', p_kim, w_id),
    (g_tom, 'Tom', 'Kim', 'tom.kim@example.com', 'KIM0-2026', 'yes', false,
      NULL, 'groom', 'a', false, NULL, 1,
      '321 Maple Dr, Del Mar, CA 92014', true, '858-555-0402', NULL, 'email',
      false, false, false, 'male', 'best_man', p_kim, w_id),

    -- Wilson Party (bride side, B-list, RSVP no)
    (g_rachel, 'Rachel', 'Wilson', 'rachel.w@example.com', 'WILS-2026', 'no', false,
      NULL, 'bride', 'b', false, NULL, 1,
      '654 Cedar Blvd, Carlsbad, CA 92008', false, '760-555-0501', NULL, 'email',
      false, false, false, 'female', NULL, p_wilson, w_id),

    -- Chen Party (groom side, B-list, RSVP yes)
    (g_ben, 'Ben', 'Chen', 'ben.chen@example.com', 'CHEN-2026', 'yes', true,
      NULL, 'groom', 'b', false, NULL, 0,
      '987 Birch Rd, Solana Beach, CA 92075', false, '858-555-0601', NULL, 'text',
      false, false, false, 'male', NULL, p_chen, w_id),

    -- Taylor Party (both sides, A-list, mixed RSVP + plus one)
    (g_sophie, 'Sophie', 'Taylor', 'sophie.t@example.com', 'TAYL-2026', 'yes', true,
      'Vegan', 'both', 'a', false, NULL, 1,
      '111 Walnut Way, Pacific Beach, CA 92109', true, '619-555-0701', NULL, 'email',
      false, false, false, 'female', 'maid_of_honor', p_taylor, w_id),
    (g_sophie_plus, 'Jordan', 'Taylor-Plus', NULL, 'TAYL-2026', 'yes', false,
      NULL, 'both', 'a', true, g_sophie, 0,
      NULL, false, NULL, NULL, NULL,
      false, false, false, 'male', NULL, p_taylor, w_id),

    -- Brown Party (bride side, C-list, pending)
    (g_alex, 'Alex', 'Brown', 'alex.b@example.com', 'BRWN-2026', 'pending', false,
      NULL, 'bride', 'c', false, NULL, 0,
      NULL, false, '619-555-0801', NULL, 'text',
      false, false, false, NULL, NULL, p_brown, w_id),
    (g_nina, 'Nina', 'Brown', 'nina.b@example.com', 'BRWN-2026', 'pending', false,
      NULL, 'bride', 'c', false, NULL, 0,
      NULL, false, '619-555-0802', NULL, 'text',
      false, false, false, 'female', NULL, p_brown, w_id),

    -- Additional standalone guests
    (g_chris, 'Chris', 'Martinez', 'chris.m@example.com', 'CHEN-2026', 'pending', false,
      NULL, 'groom', 'b', false, NULL, 0,
      NULL, false, NULL, NULL, NULL,
      false, false, false, 'male', 'groomsman', p_chen, w_id),
    (g_jessica, 'Jessica', 'Lee', 'jessica.l@example.com', 'KIM0-2026', 'yes', false,
      'Dairy-free', 'groom', 'a', false, NULL, 1,
      '555 Palm St, San Diego, CA 92102', true, '619-555-0901', NULL, 'email',
      false, false, false, 'female', 'bridesmaid', p_kim, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Events
  -- =========================================================================
  INSERT INTO events (id, name, description, event_date, start_time, end_time,
    location_name, location_address, latitude, longitude, is_default, display_order, wedding_id) VALUES
    (ev_ceremony, 'Wedding Ceremony', 'Join us as we say "I do" at The Immaculata',
      '2026-07-30', '14:00', '15:00',
      'The Immaculata', '5998 Alcalá Park, San Diego, CA 92110',
      32.7719, -117.1902, true, 1, w_id),
    (ev_reception, 'Reception', 'Dinner, drinks, and dancing at Headquarters at Seaport',
      '2026-07-30', '17:00', '23:00',
      'Headquarters at Seaport', '789 W Harbor Dr, San Diego, CA 92101',
      32.7091, -117.1689, true, 2, w_id),
    (ev_rehearsal, 'Rehearsal Dinner', 'For the wedding party and close family',
      '2026-07-29', '18:00', '21:00',
      'Coasterra', '880 Harbor Island Dr, San Diego, CA 92101',
      32.7250, -117.1870, false, 3, w_id)
  ON CONFLICT DO NOTHING;

  -- Guest event invites (all guests invited to default events)
  INSERT INTO guest_event_invites (guest_id, event_id, rsvp_status, wedding_id)
  SELECT g.id, ev_ceremony, g.rsvp_status, w_id
  FROM guests g WHERE g.wedding_id = w_id
  ON CONFLICT DO NOTHING;

  INSERT INTO guest_event_invites (guest_id, event_id, rsvp_status, wedding_id)
  SELECT g.id, ev_reception, g.rsvp_status, w_id
  FROM guests g WHERE g.wedding_id = w_id
  ON CONFLICT DO NOTHING;

  -- Wedding party members get rehearsal dinner invite
  INSERT INTO guest_event_invites (guest_id, event_id, rsvp_status, wedding_id)
  SELECT g.id, ev_rehearsal,
    CASE WHEN g.rsvp_status = 'yes' THEN 'yes' ELSE 'pending' END,
    w_id
  FROM guests g WHERE g.wedding_id = w_id AND g.bridal_party_role IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Hotels
  -- =========================================================================
  INSERT INTO hotels (id, name, description, address, website_url, phone, image_url,
    latitude, longitude, hotel_type, distance_to_venue, parking_info, amenities,
    display_order, wedding_id) VALUES
    (h_del, 'Hotel del Coronado', 'Iconic beachfront resort with stunning ocean views and world-class amenities. A San Diego landmark since 1888.',
      '1500 Orange Ave, Coronado, CA 92118', 'https://hoteldel.com', '619-435-6611',
      '/hotels/hotel-del.jpg', 32.6810, -117.1784, 'luxury',
      '15 min drive to ceremony', 'Valet parking $65/night, self-park $45/night',
      'Beach access, Pool, Spa, Multiple restaurants, Fitness center',
      1, w_id),
    (h_marriott, 'Marriott Marquis San Diego Marina', 'Modern waterfront hotel in the heart of downtown with marina views and easy access to the Gaslamp Quarter.',
      '333 W Harbor Dr, San Diego, CA 92101', 'https://marriott.com', '619-234-1500',
      '/hotels/marriott.jpg', 32.7085, -117.1680, 'moderate',
      '5 min walk to reception', 'Self-park $55/night, valet $65/night',
      'Pool, Spa, Fitness center, Marina views, Walking distance to Gaslamp',
      2, w_id),
    (h_hilton, 'Hilton San Diego Mission Valley', 'Comfortable hotel near Qualcomm transit station with great value and easy freeway access.',
      '901 Camino Del Rio S, San Diego, CA 92108', 'https://hilton.com', '619-543-9000',
      '/hotels/hilton.jpg', 32.7635, -117.1545, 'budget',
      '20 min drive to ceremony', 'Free self-parking',
      'Pool, Fitness center, Free parking, Near trolley station',
      3, w_id)
  ON CONFLICT DO NOTHING;

  -- Some hotel interests
  INSERT INTO guest_hotel_interests (guest_id, hotel_id, invite_code, status, check_in_date, check_out_date, number_of_rooms, wedding_id) VALUES
    (g_james, h_del, 'SMTH-2026', 'booked', '2026-07-29', '2026-08-01', 1, w_id),
    (g_mike, h_marriott, 'GARC-2026', 'booked', '2026-07-29', '2026-07-31', 1, w_id),
    (g_david, h_marriott, 'JOHN-2026', 'interested', NULL, NULL, NULL, w_id),
    (g_sophie, h_del, 'TAYL-2026', 'interested', NULL, NULL, NULL, w_id),
    (g_ben, h_hilton, 'CHEN-2026', 'booked', '2026-07-30', '2026-07-31', 1, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Activity interests
  -- =========================================================================
  -- Get some activity IDs (seeded by migration 012)
  INSERT INTO guest_activity_interests (guest_id, activity_id, invite_code, status, wedding_id)
  SELECT g_sophie, a.id, 'TAYL-2026', 'committed', w_id
  FROM activities a WHERE a.name = 'La Jolla Cove' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO guest_activity_interests (guest_id, activity_id, invite_code, status, wedding_id)
  SELECT g_emily, a.id, 'KIM0-2026', 'interested', w_id
  FROM activities a WHERE a.name = 'Balboa Park' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO guest_activity_interests (guest_id, activity_id, invite_code, status, wedding_id)
  SELECT g_james, a.id, 'SMTH-2026', 'interested', w_id
  FROM activities a WHERE a.name = 'San Diego Zoo' LIMIT 1
  ON CONFLICT DO NOTHING;

  INSERT INTO guest_activity_interests (guest_id, activity_id, invite_code, status, wedding_id)
  SELECT g_ben, a.id, 'CHEN-2026', 'committed', w_id
  FROM activities a WHERE a.name = 'Coronado Beach' LIMIT 1
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Seating chart (draft)
  -- =========================================================================
  INSERT INTO seating_charts (id, name, default_seats_per_table, is_active, notes, wedding_id) VALUES
    (sc_main, 'Reception Seating', 8, true, 'Draft layout — still arranging tables', w_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO seating_tables (id, seating_chart_id, table_number, table_name, capacity_override,
    position_x, position_y, shape, wedding_id) VALUES
    (st_1, sc_main, 1, 'Head Table',    10, 400, 100, 'rectangle', w_id),
    (st_2, sc_main, 2, 'Family Table',  8,  200, 300, 'round', w_id),
    (st_3, sc_main, 3, 'Friends Table', 8,  600, 300, 'round', w_id)
  ON CONFLICT DO NOTHING;

  -- Assign some guests to tables
  INSERT INTO guest_table_assignments (seating_table_id, guest_id, seat_number, wedding_id) VALUES
    (st_1, g_sophie, 1, w_id),
    (st_1, g_sophie_plus, 2, w_id),
    (st_1, g_emily, 3, w_id),
    (st_1, g_tom, 4, w_id),
    (st_2, g_james, 1, w_id),
    (st_2, g_sarah, 2, w_id),
    (st_2, g_max, 3, w_id),
    (st_2, g_mike, 4, w_id),
    (st_2, g_lisa, 5, w_id),
    (st_3, g_ben, 1, w_id),
    (st_3, g_jessica, 2, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Gifts (simulated Stripe charges)
  -- =========================================================================
  INSERT INTO gifts (stripe_charge_id, stripe_payment_intent_id, donor_email, donor_name,
    amount_cents, currency, gift_type, guest_id, status, notes, wedding_id) VALUES
    ('ch_seed_001', 'pi_seed_001', 'james.smith@example.com', 'James Smith',
      15000, 'usd', 'honeymoon', g_james, 'completed', 'Have an amazing honeymoon!', w_id),
    ('ch_seed_002', 'pi_seed_002', 'emily.kim@example.com', 'Emily Kim',
      10000, 'usd', 'baby_fund', g_emily, 'completed', 'For the little one!', w_id),
    ('ch_seed_003', 'pi_seed_003', 'sophie.t@example.com', 'Sophie Taylor',
      20000, 'usd', 'honeymoon', g_sophie, 'completed', NULL, w_id),
    ('ch_seed_004', 'pi_seed_004', 'ben.chen@example.com', 'Ben Chen',
      7500, 'usd', 'student_loans', g_ben, 'completed', 'Pay off those loans!', w_id),
    ('ch_seed_005', 'pi_seed_005', 'unknown@example.com', 'Anonymous Donor',
      5000, 'usd', 'baby_fund', NULL, 'completed', NULL, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Wedding todos
  -- =========================================================================
  INSERT INTO wedding_todos (title, is_completed, display_order, wedding_id) VALUES
    ('Book photographer',           true,  1, w_id),
    ('Finalize guest list',         true,  2, w_id),
    ('Order wedding cake',          true,  3, w_id),
    ('Book florist',                true,  4, w_id),
    ('Send save-the-dates',         true,  5, w_id),
    ('Mail invitations',            true,  6, w_id),
    ('Finalize seating chart',      false, 7, w_id),
    ('Arrange transportation',      false, 8, w_id),
    ('Confirm catering menu',       false, 9, w_id),
    ('Write vows',                  false, 10, w_id),
    ('Pick up suits',               false, 11, w_id),
    ('Final dress fitting',         false, 12, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Guest photos (simulated reception uploads)
  -- =========================================================================
  INSERT INTO guest_photos (url, uploader_name, is_visible, wedding_id) VALUES
    ('https://utfs.io/f/seed-photo-1.jpg', 'Sophie Taylor', true, w_id),
    ('https://utfs.io/f/seed-photo-2.jpg', 'Emily Kim',     true, w_id),
    ('https://utfs.io/f/seed-photo-3.jpg', NULL,            true, w_id),
    ('https://utfs.io/f/seed-photo-4.jpg', 'James Smith',   true, w_id),
    ('https://utfs.io/f/seed-photo-5.jpg', 'Ben Chen',      true, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Documents
  -- =========================================================================
  INSERT INTO documents (title, description, file_url, file_type, file_size, category, uploaded_by, wedding_id) VALUES
    ('Venue Contract', 'Signed contract with Headquarters at Seaport', 'https://utfs.io/f/seed-venue-contract.pdf', 'application/pdf', 245000, 'contract', 'admin@example.com', w_id),
    ('Catering Invoice', 'Final catering invoice from Coasterra', 'https://utfs.io/f/seed-catering-invoice.pdf', 'application/pdf', 128000, 'receipt', 'admin@example.com', w_id),
    ('Reception Floor Plan', 'Table layout for the reception venue', 'https://utfs.io/f/seed-floor-plan.pdf', 'application/pdf', 520000, 'floor_plan', 'admin@example.com', w_id),
    ('Day-of Timeline', 'Minute-by-minute schedule for the wedding day', 'https://utfs.io/f/seed-timeline.pdf', 'application/pdf', 95000, 'timeline', 'admin@example.com', w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Service links
  -- =========================================================================
  INSERT INTO service_links (title, url, description, category, sort_order, wedding_id) VALUES
    ('Headquarters at Seaport', 'https://headquarters.com', 'Reception venue', 'venue', 1, w_id),
    ('The Immaculata', 'https://sandiego.edu/immaculata', 'Ceremony venue', 'venue', 2, w_id),
    ('Coasterra', 'https://cohnrestaurants.com/coasterra', 'Rehearsal dinner venue and catering', 'catering', 3, w_id),
    ('DJ Mike', 'https://djmike.example.com', 'Reception DJ and MC', 'music', 4, w_id),
    ('Bloom & Petal', 'https://bloomandpetal.example.com', 'Wedding flowers and centerpieces', 'flowers', 5, w_id),
    ('Capture Moments Photography', 'https://capturemoments.example.com', 'Wedding photographer', 'photography', 6, w_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- Travel info for some guests
  -- =========================================================================
  UPDATE guests SET
    arrival_date = '2026-07-29',
    arrival_transport = 'Flying into SAN',
    departure_date = '2026-08-01',
    departure_transport = 'Flying out of SAN',
    accommodation_notes = 'Staying at Hotel del Coronado'
  WHERE id = g_james;

  UPDATE guests SET
    arrival_date = '2026-07-29',
    arrival_transport = 'Driving from LA',
    departure_date = '2026-07-31',
    departure_transport = 'Driving back to LA'
  WHERE id = g_mike;

  UPDATE guests SET
    arrival_date = '2026-07-30',
    arrival_transport = 'Local — no travel needed',
    departure_date = NULL,
    departure_transport = NULL
  WHERE id = g_sophie;

END $$;
