import * as fs from "node:fs";
import * as path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/admin.json";
const testDataFile = "e2e/.auth/test-data.json";

/**
 * Setup for authenticated admin tests.
 *
 * In CI, the database has already been reset and seeded via POST /api/e2e/reset
 * before Playwright runs. This setup only handles Clerk authentication.
 *
 * Set the following environment variables:
 * - TEST_ADMIN_EMAIL: Email of the test admin user
 * - TEST_ADMIN_PASSWORD: Password for the test admin user
 */
setup("authenticate as admin", async ({ page }) => {
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!adminEmail || !adminPassword) {
    console.warn(
      "Skipping auth setup: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set",
    );
    fs.writeFileSync(testDataFile, JSON.stringify({ authAvailable: false }));
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // Navigate to home page first (clerk.signIn requires a page that loads Clerk)
  await page.goto("/");

  // Sign in programmatically using Clerk's test helper
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: adminEmail,
      password: adminPassword,
    },
  });

  // Navigate to admin page
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");

  // Verify we're on admin and not unauthorized or sign-in
  await expect(page).not.toHaveURL(/unauthorized/);
  await expect(page).not.toHaveURL(/sign-in/);

  // Save the authentication state
  await page.context().storageState({ path: authFile });

  // Write test data with seed constants for other tests
  const testData = {
    authAvailable: true,
    // Seed data invite codes (deterministic, from lib/db/seed.ts)
    inviteCode: "E2E1-SNGL",
    multiGuestPartyCode: "E2E2-FMLY",
    testGuestName: "E2E-Alice",
    testGuestEmail: "e2e-alice@example.com",
    multiGuestPartyNames: ["E2E-Bob", "E2E-Carol"],
  };

  fs.mkdirSync(path.dirname(testDataFile), { recursive: true });
  fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2));

  console.log("Admin authenticated, seed data references written");
});
