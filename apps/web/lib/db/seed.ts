import { sql } from "kysely";
import { db } from "./index";

/**
 * Deterministic seed data IDs for E2E tests.
 * Use these constants in test specs to reference known entities.
 */
export const SEED = {
  parties: {
    single: {
      id: "e2e-party-single",
      inviteCode: "E2E1-SNGL",
    },
    family: {
      id: "e2e-party-family",
      inviteCode: "E2E2-FMLY",
    },
  },
  guests: {
    alice: {
      id: "e2e-guest-alice",
      firstName: "E2E-Alice",
      lastName: "TestGuest",
      email: "e2e-alice@example.com",
    },
    bob: {
      id: "e2e-guest-bob",
      firstName: "E2E-Bob",
      lastName: "TestGuest",
      email: "e2e-bob@example.com",
    },
    carol: {
      id: "e2e-guest-carol",
      firstName: "E2E-Carol",
      lastName: "TestChild",
      email: null,
    },
  },
  events: {
    ceremony: {
      id: "e2e-event-ceremony",
      name: "Ceremony",
    },
    reception: {
      id: "e2e-event-reception",
      name: "Reception",
    },
  },
} as const;

/**
 * Truncate all tables in the database.
 * Uses CASCADE to handle foreign key constraints.
 */
async function truncateAll() {
  await sql`
    TRUNCATE TABLE
      guest_table_assignments,
      seating_tables,
      seating_charts,
      guest_event_invites,
      guest_activity_interests,
      guest_hotel_interests,
      gifts,
      wedding_todos,
      guests,
      parties,
      events,
      activities,
      photos,
      hotels
    CASCADE
  `.execute(db);
}

/**
 * Seed the database with deterministic E2E test data.
 */
async function seedData() {
  // Parties
  await db
    .insertInto("parties")
    .values([
      {
        id: SEED.parties.single.id,
        invite_code: SEED.parties.single.inviteCode,
        name: "Alice Solo",
        side: "bride",
        list: "a",
      },
      {
        id: SEED.parties.family.id,
        invite_code: SEED.parties.family.inviteCode,
        name: "Bob Family",
        side: "groom",
        list: "a",
      },
    ])
    .execute();

  // Guests
  await db
    .insertInto("guests")
    .values([
      {
        id: SEED.guests.alice.id,
        first_name: SEED.guests.alice.firstName,
        last_name: SEED.guests.alice.lastName,
        email: SEED.guests.alice.email,
        invite_code: SEED.parties.single.inviteCode,
        rsvp_status: "pending",
        plus_one_allowed: true,
        side: "bride",
        list: "a",
        is_plus_one: false,
        number_of_resends: 0,
        physical_invite_sent: false,
        family: false,
        under_21: false,
        three_and_under: false,
        party_id: SEED.parties.single.id,
      },
      {
        id: SEED.guests.bob.id,
        first_name: SEED.guests.bob.firstName,
        last_name: SEED.guests.bob.lastName,
        email: SEED.guests.bob.email,
        invite_code: SEED.parties.family.inviteCode,
        rsvp_status: "yes",
        plus_one_allowed: false,
        side: "groom",
        list: "a",
        is_plus_one: false,
        number_of_resends: 0,
        physical_invite_sent: false,
        family: true,
        under_21: false,
        three_and_under: false,
        party_id: SEED.parties.family.id,
      },
      {
        id: SEED.guests.carol.id,
        first_name: SEED.guests.carol.firstName,
        last_name: SEED.guests.carol.lastName,
        email: null,
        invite_code: SEED.parties.family.inviteCode,
        rsvp_status: "yes",
        plus_one_allowed: false,
        side: "groom",
        list: "a",
        is_plus_one: false,
        number_of_resends: 0,
        physical_invite_sent: false,
        family: true,
        under_21: true,
        three_and_under: false,
        party_id: SEED.parties.family.id,
      },
    ])
    .execute();

  // Events
  await db
    .insertInto("events")
    .values([
      {
        id: SEED.events.ceremony.id,
        name: SEED.events.ceremony.name,
        description: "Wedding ceremony",
        is_default: true,
        display_order: 1,
      },
      {
        id: SEED.events.reception.id,
        name: SEED.events.reception.name,
        description: "Wedding reception",
        is_default: true,
        display_order: 2,
      },
    ])
    .execute();

  // Guest event invites
  await db
    .insertInto("guest_event_invites")
    .values([
      {
        guest_id: SEED.guests.alice.id,
        event_id: SEED.events.ceremony.id,
      },
      {
        guest_id: SEED.guests.alice.id,
        event_id: SEED.events.reception.id,
      },
      {
        guest_id: SEED.guests.bob.id,
        event_id: SEED.events.ceremony.id,
        rsvp_status: "yes",
      },
      {
        guest_id: SEED.guests.bob.id,
        event_id: SEED.events.reception.id,
        rsvp_status: "yes",
      },
    ])
    .execute();

  // Wedding todos
  await db
    .insertInto("wedding_todos")
    .values([
      {
        title: "Book the florist",
        display_order: 1,
      },
      {
        title: "Order wedding cake",
        display_order: 2,
      },
      {
        title: "Finalize seating chart",
        is_completed: true,
        display_order: 3,
      },
    ])
    .execute();
}

/**
 * Reset the database and seed with deterministic test data.
 * Called by POST /api/e2e/reset on preview deployments.
 */
export async function resetAndSeed() {
  await truncateAll();
  await seedData();
}
