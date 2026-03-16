import { sql } from "kysely";
import { db } from "./index";

/**
 * Deterministic seed data for E2E tests.
 * IDs are generated fresh each reset; use invite codes and names to reference entities in tests.
 */
export const SEED = {
  parties: {
    single: {
      id: crypto.randomUUID(),
      inviteCode: "E2E1-SNGL",
    },
    family: {
      id: crypto.randomUUID(),
      inviteCode: "E2E2-FMLY",
    },
  },
  guests: {
    alice: {
      id: crypto.randomUUID(),
      firstName: "E2E-Alice",
      lastName: "TestGuest",
      email: "e2e-alice@example.com",
    },
    bob: {
      id: crypto.randomUUID(),
      firstName: "E2E-Bob",
      lastName: "TestGuest",
      email: "e2e-bob@example.com",
    },
    carol: {
      id: crypto.randomUUID(),
      firstName: "E2E-Carol",
      lastName: "TestChild",
      email: null,
    },
  },
  events: {
    ceremony: {
      id: crypto.randomUUID(),
      name: "Ceremony",
    },
    reception: {
      id: crypto.randomUUID(),
      name: "Reception",
    },
  },
  guestPhotos: {
    visible1: { id: crypto.randomUUID() },
    visible2: { id: crypto.randomUUID() },
    hidden1: { id: crypto.randomUUID() },
    deletable: { id: crypto.randomUUID() },
  },
};

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
      hotels,
      guest_photos
    CASCADE
  `.execute(db);
}

/**
 * Seed the database with deterministic E2E test data.
 */
async function seedData() {
  // Events first (needed before guests, since guest insert trigger creates invites for default events)
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

  // Guests (trigger `invite_new_guest_to_default_events` auto-creates guest_event_invites)
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

  // Update Bob & Carol's event invites to "yes" (trigger created them as "pending")
  await db
    .updateTable("guest_event_invites")
    .set({ rsvp_status: "yes" })
    .where("guest_id", "in", [SEED.guests.bob.id, SEED.guests.carol.id])
    .execute();

  // Guest photos (seed for E2E tests — 4 total: 3 visible, 1 hidden)
  await db
    .insertInto("guest_photos")
    .values([
      {
        id: SEED.guestPhotos.visible1.id,
        url: "https://utfs.io/f/e2e-photo-1.jpg",
        uploader_name: "E2E-Guest",
        is_visible: true,
      },
      {
        id: SEED.guestPhotos.visible2.id,
        url: "https://utfs.io/f/e2e-photo-2.jpg",
        uploader_name: null,
        is_visible: true,
      },
      {
        id: SEED.guestPhotos.hidden1.id,
        url: "https://utfs.io/f/e2e-photo-3.jpg",
        uploader_name: "E2E-Hidden",
        is_visible: false,
        hidden_at: new Date("2026-01-15T10:00:00Z"),
        hidden_by: "admin@example.com",
      },
      {
        id: SEED.guestPhotos.deletable.id,
        url: "https://utfs.io/f/e2e-photo-4.jpg",
        uploader_name: "E2E-Delete-Me",
        is_visible: true,
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
