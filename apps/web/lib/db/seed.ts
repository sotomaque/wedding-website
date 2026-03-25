import { getDefaultTemplates } from "@/lib/email/default-templates";
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
  wedding2: {
    slug: "e2e-test-wedding",
    inviteCode: "E2E3-WED2",
    guestFirstName: "E2E-W2Guest",
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
      guest_photos,
      wedding_content,
      registry_items,
      wedding_admins,
      service_links,
      documents
    CASCADE
  `);
}

/**
 * Seed the database with deterministic E2E test data.
 */
async function seedData() {
  // Get the default wedding ID
  const wedding = await db.wedding.findFirst({
    where: { slug: process.env.DEFAULT_WEDDING_SLUG || "helen-and-enrique" },
    select: { id: true },
  });
  if (!wedding) throw new Error("Default wedding not found for seeding");
  const weddingId = wedding.id;

  // Events first (needed before guests, since guest insert trigger creates invites for default events)
  await db.event.createMany({
    data: [
      {
        id: SEED.events.ceremony.id,
        name: SEED.events.ceremony.name,
        description: "Wedding ceremony",
        isDefault: true,
        displayOrder: 1,
        weddingId,
      },
      {
        id: SEED.events.reception.id,
        name: SEED.events.reception.name,
        description: "Wedding reception",
        isDefault: true,
        displayOrder: 2,
        weddingId,
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
        weddingId,
      },
      {
        id: SEED.parties.family.id,
        inviteCode: SEED.parties.family.inviteCode,
        name: "Bob Family",
        side: "groom",
        list: "a",
        weddingId,
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
        weddingId,
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
        weddingId,
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
        weddingId,
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
        weddingId,
      },
      {
        id: SEED.guestPhotos.visible2.id,
        url: "https://utfs.io/f/e2e-photo-2.jpg",
        uploaderName: null,
        isVisible: true,
        weddingId,
      },
      {
        id: SEED.guestPhotos.hidden1.id,
        url: "https://utfs.io/f/e2e-photo-3.jpg",
        uploaderName: "E2E-Hidden",
        isVisible: false,
        hiddenAt: new Date("2026-01-15T10:00:00Z"),
        hiddenBy: "admin@example.com",
        weddingId,
      },
      {
        id: SEED.guestPhotos.deletable.id,
        url: "https://utfs.io/f/e2e-photo-4.jpg",
        uploaderName: "E2E-Delete-Me",
        isVisible: true,
        weddingId,
      },
    ],
  });

  // Wedding todos
  await db.weddingTodo.createMany({
    data: [
      {
        title: "Book the florist",
        displayOrder: 1,
        weddingId,
      },
      {
        title: "Order wedding cake",
        displayOrder: 2,
        weddingId,
      },
      {
        title: "Finalize seating chart",
        isCompleted: true,
        displayOrder: 3,
        weddingId,
      },
    ],
  });

  // --- Wedding 1 email templates ---
  await db.emailTemplate.createMany({
    skipDuplicates: true,
    data: getDefaultTemplates(weddingId),
  });

  // --- Wedding 1 content + registry (truncated by E2E reset) ---

  await db.weddingContent.createMany({
    data: [
      {
        weddingId,
        section: "hero",
        content: { title: "Helen & Enrique" },
      },
      {
        weddingId,
        section: "story",
        content: {
          title: "Our Story",
          paragraphs: [
            "We met in Seattle in 2020.",
            "Our journey took us to Hawaii and then San Diego.",
          ],
        },
      },
      {
        weddingId,
        section: "details",
        content: {
          title: "Wedding Details",
          dateFormatted: "Thursday, July 30, 2026",
          ceremony: {
            title: "Ceremony",
            time: "4:00 PM",
            venue: "St. Therese of Carmel",
            address: "4355 Del Mar Trails Rd, San Diego, CA 92130",
          },
          reception: {
            title: "Reception",
            time: "6:00 PM",
            venue: "Headquarters",
            address: "789 W Harbor Dr Suite 148, San Diego, CA 92101",
          },
        },
      },
      {
        weddingId,
        section: "schedule",
        content: {
          title: "Schedule",
          events: [
            { id: "ceremony", time: "4:00 PM", event: "Ceremony" },
            { id: "reception", time: "6:00 PM", event: "Reception" },
          ],
        },
      },
      {
        weddingId,
        section: "rsvp",
        content: { title: "RSVP", deadline: "Please respond by March 1, 2026" },
      },
    ],
  });

  await db.registryItem.createMany({
    data: [
      {
        weddingId,
        title: "Future Tiny Humans Fund",
        description: "Help us prepare for the chaos ahead.",
        imageUrl: "/registry/future-babies.jpg",
        emoji: "👶",
        displayOrder: 0,
      },
      {
        weddingId,
        title: "Send Us Somewhere Pretty",
        description: "Fund our first adventure as a married couple.",
        imageUrl: "/registry/honeymoon.jpg",
        emoji: "✈️",
        displayOrder: 1,
      },
      {
        weddingId,
        title: "Bye Bye Student Loans",
        description: "Contribute to our freedom fund.",
        imageUrl: "/registry/student-loan-relief.jpg",
        emoji: "🎓",
        displayOrder: 2,
      },
    ],
  });

  // --- Second wedding for multi-tenancy testing ---

  // Delete existing second wedding if present (clean slate)
  await db.wedding.deleteMany({ where: { slug: SEED.wedding2.slug } });

  const wedding2 = await db.wedding.create({
    data: {
      slug: SEED.wedding2.slug,
      coupleName: "E2E-Test & Partner",
      person1Name: "E2E-Test",
      person2Name: "E2E-Partner",
      weddingDate: new Date("2027-01-15"),
      timezone: "America/Los_Angeles",
      contactEmail: "e2e-test@example.com",
      notificationEmails: "e2e-test@example.com",
      emailFromName: "E2E Test Wedding",
      status: "published",
      featureToggles: {
        hotels: true,
        vendors: true,
        thingsToDo: true,
        tripPlanner: true,
        registry: true,
        guestPhotos: true,
        slideshow: true,
      },
      themeId: "sage-garden",
    },
  });

  // Create admin for the second wedding
  await db.weddingAdmin.create({
    data: {
      weddingId: wedding2.id,
      email: process.env.TEST_ADMIN_EMAIL || "admin@example.com",
      role: "owner",
    },
  });

  // Create a party and guest in the second wedding
  const w2Party = await db.party.create({
    data: {
      inviteCode: SEED.wedding2.inviteCode,
      name: "Wedding 2 Party",
      side: "bride",
      list: "a",
      weddingId: wedding2.id,
    },
  });

  await db.guest.create({
    data: {
      firstName: SEED.wedding2.guestFirstName,
      lastName: "TestGuest",
      email: "e2e-w2guest@example.com",
      inviteCode: SEED.wedding2.inviteCode,
      partyId: w2Party.id,
      rsvpStatus: "pending",
      plusOneAllowed: false,
      isPlusOne: false,
      numberOfResends: 0,
      physicalInviteSent: false,
      family: false,
      under21: false,
      threeAndUnder: false,
      weddingId: wedding2.id,
      side: "bride",
      list: "a",
    },
  });

  // Create email templates for second wedding
  await db.emailTemplate.createMany({
    skipDuplicates: true,
    data: getDefaultTemplates(wedding2.id),
  });

  // Create default content for second wedding
  await db.weddingContent.createMany({
    data: [
      {
        weddingId: wedding2.id,
        section: "hero",
        content: { title: "E2E-Test & Partner" },
      },
      {
        weddingId: wedding2.id,
        section: "story",
        content: { title: "Our Story", paragraphs: ["Test story."] },
      },
      {
        weddingId: wedding2.id,
        section: "rsvp",
        content: { title: "RSVP" },
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
