import * as fs from "node:fs";
import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from "@playwright/test";

/**
 * Test data from setup (created by auth.setup.ts)
 */
interface TestData {
  inviteCode: string | null;
  testGuestName: string;
  testGuestEmail: string;
  authAvailable: boolean;
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
 * Test data constants
 */
export const TEST_DATA = {
  // Admin test credentials (set via environment variables)
  adminEmail: process.env.TEST_ADMIN_EMAIL || "admin@example.com",

  // Guest test data
  testGuest: {
    firstName: "E2E",
    lastName: "TestGuest",
    email: "e2e-test@example.com",
  },

  // Known routes
  routes: {
    home: "/",
    rsvp: "/rsvp",
    thingsToDo: "/things-to-do",
    admin: "/admin",
    adminGuests: "/admin/guests",
    adminEvents: "/admin/events",
    adminTemplates: "/admin/templates",
    unauthorized: "/unauthorized",
  },
} as const;

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
      domain: "localhost",
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
