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
  // Prisma doesn't have raw TRUNCATE by default, so we use $executeRawUnsafe
  await db.$executeRawUnsafe(`
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
  `);
}

/**
 * Seed the database with deterministic E2E test data.
 */
async function seedData() {
  // Events first (needed before guests, since guest insert trigger creates invites for default events)
  await db.event.createMany({
    data: [
      {
        id: SEED.events.ceremony.id,
        name: SEED.events.ceremony.name,
        description: "Wedding ceremony",
        isDefault: true,
        displayOrder: 1,
      },
      {
        id: SEED.events.reception.id,
        name: SEED.events.reception.name,
        description: "Wedding reception",
        isDefault: true,
        displayOrder: 2,
      },
    ],
  });

  // Parties
  await db.party.createMany({
    data: [
      {
        id: SEED.parties.single.id,
        inviteCode: SEED.parties.single.inviteCode,
        name: "Alice Solo",
        side: "bride",
        list: "a",
      },
      {
        id: SEED.parties.family.id,
        inviteCode: SEED.parties.family.inviteCode,
        name: "Bob Family",
        side: "groom",
        list: "a",
      },
    ],
  });

  // Guests (trigger `invite_new_guest_to_default_events` auto-creates guest_event_invites)
  await db.guest.createMany({
    data: [
      {
        id: SEED.guests.alice.id,
        firstName: SEED.guests.alice.firstName,
        lastName: SEED.guests.alice.lastName,
        email: SEED.guests.alice.email,
        inviteCode: SEED.parties.single.inviteCode,
        rsvpStatus: "pending",
        plusOneAllowed: true,
        side: "bride",
        list: "a",
        isPlusOne: false,
        numberOfResends: 0,
        physicalInviteSent: false,
        family: false,
        under21: false,
        threeAndUnder: false,
        partyId: SEED.parties.single.id,
      },
      {
        id: SEED.guests.bob.id,
        firstName: SEED.guests.bob.firstName,
        lastName: SEED.guests.bob.lastName,
        email: SEED.guests.bob.email,
        inviteCode: SEED.parties.family.inviteCode,
        rsvpStatus: "yes",
        plusOneAllowed: false,
        side: "groom",
        list: "a",
        isPlusOne: false,
        numberOfResends: 0,
        physicalInviteSent: false,
        family: true,
        under21: false,
        threeAndUnder: false,
        partyId: SEED.parties.family.id,
      },
      {
        id: SEED.guests.carol.id,
        firstName: SEED.guests.carol.firstName,
        lastName: SEED.guests.carol.lastName,
        email: null,
        inviteCode: SEED.parties.family.inviteCode,
        rsvpStatus: "yes",
        plusOneAllowed: false,
        side: "groom",
        list: "a",
        isPlusOne: false,
        numberOfResends: 0,
        physicalInviteSent: false,
        family: true,
        under21: true,
        threeAndUnder: false,
        partyId: SEED.parties.family.id,
      },
    ],
  });

  // Update Bob & Carol's event invites to "yes" (trigger created them as "pending")
  await db.guestEventInvite.updateMany({
    where: {
      guestId: { in: [SEED.guests.bob.id, SEED.guests.carol.id] },
    },
    data: { rsvpStatus: "yes" },
  });

  // Guest photos (seed for E2E tests — 4 total: 3 visible, 1 hidden)
  await db.guestPhoto.createMany({
    data: [
      {
        id: SEED.guestPhotos.visible1.id,
        url: "https://utfs.io/f/e2e-photo-1.jpg",
        uploaderName: "E2E-Guest",
        isVisible: true,
      },
      {
        id: SEED.guestPhotos.visible2.id,
        url: "https://utfs.io/f/e2e-photo-2.jpg",
        uploaderName: null,
        isVisible: true,
      },
      {
        id: SEED.guestPhotos.hidden1.id,
        url: "https://utfs.io/f/e2e-photo-3.jpg",
        uploaderName: "E2E-Hidden",
        isVisible: false,
        hiddenAt: new Date("2026-01-15T10:00:00Z"),
        hiddenBy: "admin@example.com",
      },
      {
        id: SEED.guestPhotos.deletable.id,
        url: "https://utfs.io/f/e2e-photo-4.jpg",
        uploaderName: "E2E-Delete-Me",
        isVisible: true,
      },
    ],
  });

  // Wedding todos
  await db.weddingTodo.createMany({
    data: [
      {
        title: "Book the florist",
        displayOrder: 1,
      },
      {
        title: "Order wedding cake",
        displayOrder: 2,
      },
      {
        title: "Finalize seating chart",
        isCompleted: true,
        displayOrder: 3,
      },
    ],
  });
}

/**
 * Reset the database and seed with deterministic test data.
 * Called by POST /api/e2e/reset on preview deployments.
 */
export async function resetAndSeed() {
  await truncateAll();
  await seedData();
}
