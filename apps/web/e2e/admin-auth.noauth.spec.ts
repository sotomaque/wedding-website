import { expect, test } from "@playwright/test";
import { TEST_DATA, waitForHydration } from "./fixtures";

/**
 * Admin Authentication Tests (No Auth Required)
 *
 * Tests for:
 * - Admin pages are protected if not logged in
 * - Admin login restricted to special emails only
 * - Unauthorized users see access denied page
 */

test.describe("Admin Route Protection", () => {
  test("shows sign-in when accessing /admin without authentication", async ({
    page,
  }) => {
    await page.goto(TEST_DATA.routes.admin);
    await waitForHydration(page);

    // Should show Clerk sign-in email input
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows sign-in when accessing /admin/guests without authentication", async ({
    page,
  }) => {
    await page.goto(TEST_DATA.routes.adminGuests);
    await waitForHydration(page);

    // Should show Clerk sign-in email input
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows sign-in when accessing /admin/events without authentication", async ({
    page,
  }) => {
    await page.goto(TEST_DATA.routes.adminEvents);
    await waitForHydration(page);

    // Should show Clerk sign-in email input
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows sign-in when accessing /admin/templates without authentication", async ({
    page,
  }) => {
    await page.goto(TEST_DATA.routes.adminTemplates);
    await waitForHydration(page);

    // Should show Clerk sign-in email input
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe("Clerk Sign-In Component", () => {
  test("sign-in component loads on protected route", async ({ page }) => {
    // Go to protected admin route to trigger sign-in
    await page.goto(TEST_DATA.routes.admin);
    await waitForHydration(page);

    // Clerk's sign-in component should show email input
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });
  });

  test("sign-in component has continue button", async ({ page }) => {
    // Go to protected admin route to trigger sign-in
    await page.goto(TEST_DATA.routes.admin);
    await waitForHydration(page);

    // Wait for sign-in to load
    await expect(page.getByLabel("Email address")).toBeVisible({
      timeout: 15000,
    });

    // Continue button should be present
    // Note: Clerk renders "Continue" with an arrow icon, so we look for button containing "Continue"
    // but not "Continue with Google"
    const continueButton = page.locator(
      'button:has-text("Continue"):not(:has-text("Google"))',
    );
    await expect(continueButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Unauthorized Page", () => {
  test("unauthorized page displays access denied message", async ({ page }) => {
    await page.goto(TEST_DATA.routes.unauthorized);
    await waitForHydration(page);

    // Should show some form of "unauthorized" or "access denied" message
    const pageContent = await page.textContent("body");
    expect(
      pageContent?.toLowerCase().includes("unauthorized") ||
        pageContent?.toLowerCase().includes("access") ||
        pageContent?.toLowerCase().includes("denied") ||
        pageContent?.toLowerCase().includes("permission"),
    ).toBeTruthy();
  });
});
