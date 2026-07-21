-- Migration: Seed the wedding-week itinerary for Helen & Enrique
--
-- Adds the ancillary wedding-week activities (beach day, parks, brunch,
-- rehearsal, welcome dinner, sightseeing, etc.) as public Events so they show
-- on the /itinerary page and accept no-auth "say you're going" RSVPs.
--
-- Notes:
--   * is_default = false — these must NOT auto-invite the entire guest list
--     (the invite_all_guests_to_default_events trigger only fires for defaults).
--   * is_public = true, public_rsvp_enabled = true, and a minted
--     public_rsvp_token so each event is immediately RSVP-able.
--   * The wedding-day Ceremony/Reception already exist (see 015_add_events.sql)
--     and are intentionally left untouched; they render on the same itinerary.
--   * Idempotent: each row is skipped if an event of the same name already
--     exists for this wedding, so re-running is safe.
--   * Times/locations reflect the couple's planning sheet and can be edited in
--     the admin Events UI.

DO $$
DECLARE
  w_id uuid;
BEGIN
  SELECT id INTO w_id FROM weddings WHERE slug = 'helen-and-enrique' LIMIT 1;

  IF w_id IS NULL THEN
    RAISE NOTICE 'Wedding "helen-and-enrique" not found; skipping itinerary seed.';
    RETURN;
  END IF;

  INSERT INTO events (name, description, event_date, end_date, start_time, end_time, location_name, location_address, is_default, is_public, public_rsvp_enabled, public_rsvp_token, display_order, wedding_id)
  SELECT
    v.name, v.description, v.event_date, v.end_date, v.start_time, v.end_time,
    v.location_name, v.location_address,
    c.is_default, c.is_public, c.public_rsvp_enabled, c.public_rsvp_token,
    v.display_order, c.wedding_id
  FROM (VALUES
    ('Sunday Mass',
     'Sunday mass to start the wedding week.',
     DATE '2026-07-26', NULL::date, NULL::time, NULL::time,
     NULL::text, NULL::text, 10),
    ('Moonlight Beach Day',
     'Food, games, and drinks on the sand. Come and go as you like.',
     DATE '2026-07-26', NULL::date, TIME '10:00', TIME '15:00',
     'Moonlight Beach', 'Encinitas, CA', 11),
    ('Disney Days',
     'Two days at the parks with the Covas family.',
     DATE '2026-07-27', DATE '2026-07-28', NULL::time, NULL::time,
     'Disneyland', 'Anaheim, CA', 12),
    ('Pool, Mini Golf & Pickleball',
     'Start with mini golf or pickleball, then relax by the pool.',
     DATE '2026-07-27', NULL::date, NULL::time, NULL::time,
     'Westwood Club', NULL, 13),
    ('San Diego Zoo / Balboa Park',
     'An all-day outing — the San Diego Zoo or Balboa Park.',
     DATE '2026-07-28', NULL::date, NULL::time, NULL::time,
     'Balboa Park', 'San Diego, CA', 14),
    ('Family Brunch',
     'Brunch with the Sotomayor and Espinoza families.',
     DATE '2026-07-29', NULL::date, NULL::time, NULL::time,
     'Rancho Bernardo', 'San Diego, CA', 15),
    ('Church Rehearsal',
     'Wedding rehearsal at the church.',
     DATE '2026-07-29', NULL::date, TIME '15:00', NULL::time,
     'The Immaculata Church', '5998 Alcalá Park, San Diego, CA 92110', 16),
    ('Welcome Dinner',
     'Dinner the evening before the wedding.',
     DATE '2026-07-29', NULL::date, TIME '19:00', NULL::time,
     'Solare Ristorante', 'Liberty Station, San Diego, CA', 17),
    ('Coronado Day',
     'Beach and hotel day on Coronado Island.',
     DATE '2026-07-31', NULL::date, NULL::time, NULL::time,
     'Coronado Island', 'Coronado, CA', 18),
    ('Old Town San Diego',
     'Fiesta de Reyes (mariachi music), Casa de Estudillo, and the Robinson-Rose House.',
     DATE '2026-07-31', NULL::date, NULL::time, NULL::time,
     'Old Town San Diego', 'San Diego, CA', 19),
    ('La Jolla Seals & Beach',
     'See the seals at the Children''s Pool, then relax on the beach.',
     DATE '2026-08-01', NULL::date, NULL::time, NULL::time,
     'La Jolla Cove', 'La Jolla, CA', 20)
  ) AS v(name, description, event_date, end_date, start_time, end_time, location_name, location_address, display_order)
  CROSS JOIN LATERAL (
    SELECT false AS is_default, true AS is_public, true AS public_rsvp_enabled,
           replace(gen_random_uuid()::text, '-', '') AS public_rsvp_token, w_id AS wedding_id
  ) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM events e WHERE e.wedding_id = w_id AND e.name = v.name
  );

  RAISE NOTICE 'Itinerary seed applied for wedding %', w_id;
END $$;
