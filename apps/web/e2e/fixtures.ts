import * as fs from "node:fs";
import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from "@playwright/test";

/**
 * Test data from setup (created by auth.setup.ts, references seed data)
 */
interface TestData {
  inviteCode: string | null;
  testGuestName: string;
  testGuestEmail: string;
  authAvailable: boolean;
  // Multi-guest party data
  multiGuestPartyCode: string | null;
  multiGuestPartyNames: string[];
}

/**
 * Get test data created during setup
 */
export function getTestData(): TestData {
  try {
    const data = fs.readFileSync("e2e/.auth/test-data.json", "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      inviteCode: null,
      testGuestName: "",
      testGuestEmail: "",
      authAvailable: false,
      multiGuestPartyCode: null,
      multiGuestPartyNames: [],
    };
  }
}

/**
 * Check if admin auth is available for tests
 */
export function isAuthAvailable(): boolean {
  return getTestData().authAvailable;
}

/**
 * Extended test fixtures for wedding website E2E tests
 */
export const test = base.extend<{
  /** Test invite code for RSVP testing */
  testInviteCode: string;
}>({
  testInviteCode: async (_, use) => {
    const testData = getTestData();
    const code = testData.inviteCode || "TEST-1234";
    await use(code);
  },
});

export { expect };

/**
 * Prefixes used for E2E test data - used for local cleanup in afterAll hooks
 */
export const E2E_TEST_PREFIXES = {
  guest: "E2E-",
  chart: "E2E Test Chart",
  table: "Table Test",
  testChart: "Test Chart",
} as const;

/**
 * Test data constants
 */
export const TEST_DATA = {
  // Admin test credentials (set via environment variables)
  adminEmail: process.env.TEST_ADMIN_EMAIL || "admin@example.com",

  // Seed data references (deterministic, from lib/db/seed.ts)
  seedGuests: {
    alice: {
      firstName: "E2E-Alice",
      lastName: "TestGuest",
      email: "e2e-alice@example.com",
    },
    bob: {
      firstName: "E2E-Bob",
      lastName: "TestGuest",
      email: "e2e-bob@example.com",
    },
    carol: {
      firstName: "E2E-Carol",
      lastName: "TestChild",
    },
  },
  seedInviteCodes: {
    single: "E2E1-SNGL",
    family: "E2E2-FMLY",
  },

  // Known routes (slug-based for default wedding)
  routes: {
    landing: "/",
    home: "/helen-and-enrique",
    rsvp: "/rsvp",
    thingsToDo: "/things-to-do",
    registry: "/registry",
    registryThankYou: "/registry/thank-you",
    admin: "/admin",
    adminGuests: "/admin/guests",
    adminEvents: "/admin/events",
    adminTemplates: "/admin/templates",
    adminSeating: "/admin/seating",
    adminTodos: "/admin/todos",
    unauthorized: "/unauthorized",
  },
} as const;

/**
 * Second wedding test data for multi-tenancy tests
 */
export const SECOND_WEDDING = {
  slug: "e2e-test-wedding",
  inviteCode: "E2E3-WED2",
  guestFirstName: "E2E-W2Guest",
} as const;

/**
 * Generate slug-based routes for a given wedding slug
 */
export function slugRoutes(slug: string) {
  return {
    home: `/${slug}`,
    rsvp: `/${slug}/rsvp`,
    thingsToDo: `/${slug}/things-to-do`,
    registry: `/${slug}/registry`,
    admin: `/${slug}/admin`,
    adminGuests: `/${slug}/admin/guests`,
    adminEvents: `/${slug}/admin/events`,
    adminSettings: `/${slug}/admin/settings`,
    adminContent: `/${slug}/admin/content`,
    adminSeating: `/${slug}/admin/seating`,
    adminTodos: `/${slug}/admin/todos`,
  };
}

/**
 * Helper to wait for Next.js hydration
 */
export async function waitForHydration(page: Page) {
  // Wait for Next.js to hydrate
  await page.waitForFunction(() => {
    return document.readyState === "complete";
  });
  // Small delay for React hydration
  await page.waitForTimeout(100);
}

/**
 * Extract the domain from the base URL for cookie setting.
 * Handles both localhost and Vercel preview URLs.
 */
function getCookieDomain(): string {
  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
  try {
    const url = new URL(baseURL);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

/**
 * Helper to set invite code cookie
 */
export async function setInviteCodeCookie(
  _page: Page,
  context: BrowserContext,
  code: string,
) {
  await context.addCookies([
    {
      name: "invite_code",
      value: code,
      domain: getCookieDomain(),
      path: "/",
    },
  ]);
}

/**
 * Helper to wait for guest creation (toast may be brief)
 * Waits for either the toast to appear or the sheet to close
 */
export async function waitForGuestCreated(page: Page) {
  // Wait for either the success toast OR the sheet to close
  await Promise.race([
    expect(page.getByText(/guest created/i)).toBeVisible({ timeout: 5000 }),
    expect(
      page.getByRole("heading", { name: /add new guest/i }),
    ).not.toBeVisible({ timeout: 5000 }),
  ]).catch(() => {
    // Either condition is fine - guest was created
  });
  // Give time for the table to refresh
  await page.waitForTimeout(500);
}
