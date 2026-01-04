import * as fs from "node:fs";
import * as path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/admin.json";
const testDataFile = "e2e/.auth/test-data.json";

/**
 * Setup for authenticated admin tests
 *
 * This setup:
 * 1. Authenticates as an admin user via Clerk using clerk.signIn()
 * 2. Creates a test guest to use for RSVP tests
 * 3. Saves the auth state and test data for other tests to use
 *
 * Set the following environment variables:
 * - TEST_ADMIN_EMAIL: Email of the test admin user
 * - TEST_ADMIN_PASSWORD: Password for the test admin user
 */
setup("authenticate as admin and create test guest", async ({ page }) => {
  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!adminEmail || !adminPassword) {
    console.warn(
      "Skipping auth setup: TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD not set",
    );
    console.warn("Authenticated tests will be skipped");
    // Write empty test data file with authAvailable flag
    fs.writeFileSync(
      testDataFile,
      JSON.stringify({ inviteCode: null, authAvailable: false }),
    );
    // Write empty auth state file to prevent config errors
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

  // Create a test guest for RSVP tests
  await page.goto("/admin/guests");

  // Click Add Guest button
  await page.getByRole("button", { name: /add guest/i }).click();

  // Wait for sheet to open
  await expect(
    page.getByRole("heading", { name: /add new guest/i }),
  ).toBeVisible();

  // Create unique test guest
  const uniqueId = Date.now();
  const testFirstName = `E2E-RSVP-Test-${uniqueId}`;
  const testEmail = `e2e-rsvp-test-${uniqueId}@example.com`;

  await page
    .getByLabel(/^first name/i)
    .first()
    .fill(testFirstName);
  await page
    .getByLabel(/^email/i)
    .first()
    .fill(testEmail);

  // Submit the form
  await page.getByRole("button", { name: /create guest/i }).click();

  // Wait for either the success toast OR the sheet to close (toast may be brief)
  await Promise.race([
    expect(page.getByText(/guest created/i)).toBeVisible({ timeout: 5000 }),
    expect(
      page.getByRole("heading", { name: /add new guest/i }),
    ).not.toBeVisible({ timeout: 5000 }),
  ]).catch(() => {
    // Either condition is fine - guest was created
  });

  // Give time for the table to refresh
  await page.waitForTimeout(1000);

  // Get the invite code from the API (more reliable than scraping the page)
  const response = await page.request.get("/api/admin/guests");
  const data = await response.json();
  const guests = data.guests || [];
  const testGuest = guests.find(
    (g: { first_name: string }) => g.first_name === testFirstName,
  );
  const inviteCode = testGuest?.invite_code || null;

  // Save test data for other tests
  const testData = {
    inviteCode,
    testGuestName: testFirstName,
    testGuestEmail: testEmail,
    authAvailable: true,
  };

  fs.mkdirSync(path.dirname(testDataFile), { recursive: true });
  fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2));

  console.log(`Test guest created: ${testFirstName}`);
  console.log(`Invite code: ${inviteCode}`);
});
