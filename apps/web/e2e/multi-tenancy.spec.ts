import { expect, test } from "@playwright/test";
import {
  isAuthAvailable,
  SECOND_WEDDING,
  slugRoutes,
  waitForHydration,
} from "./fixtures";

/**
 * Multi-Tenancy Data Isolation Tests (Authenticated)
 *
 * Verifies that data is properly isolated between weddings:
 * - Admin guest lists are scoped to the correct wedding
 * - Public pages show the correct wedding content
 * - Invalid slugs return 404
 * - Theme CSS is applied per-wedding
 */

// Use stored auth state from setup
test.use({ storageState: "e2e/.auth/admin.json" });

// Run tests serially to avoid interference
test.describe.configure({ mode: "serial" });

// Skip all tests in this file if auth is not available
test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

const wedding1Routes = slugRoutes("helen-and-enrique");
const wedding2Routes = slugRoutes(SECOND_WEDDING.slug);

test.describe("Admin Data Isolation", () => {
  test("wedding 1 admin should not see wedding 2 guests", async ({ page }) => {
    await page.goto(wedding1Routes.adminGuests);
    await waitForHydration(page);

    // Should see E2E-Alice (wedding 1 guest) but NOT E2E-W2Guest (wedding 2 guest)
    await expect(page.getByText("E2E-Alice")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(SECOND_WEDDING.guestFirstName),
    ).not.toBeVisible();
  });

  test("wedding 2 admin should not see wedding 1 guests", async ({ page }) => {
    await page.goto(wedding2Routes.adminGuests);
    await waitForHydration(page);

    // Should see E2E-W2Guest (wedding 2 guest) but NOT E2E-Alice (wedding 1 guest)
    await expect(page.getByText(SECOND_WEDDING.guestFirstName)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("E2E-Alice")).not.toBeVisible();
  });
});

test.describe("Public Page Content Isolation", () => {
  test("wedding 1 public page shows correct couple name", async ({ page }) => {
    await page.goto(wedding1Routes.home);
    await waitForHydration(page);

    // The page should contain Helen & Enrique content
    const pageContent = await page.textContent("body");
    expect(
      pageContent?.includes("Helen") && pageContent?.includes("Enrique"),
    ).toBeTruthy();
  });

  test("wedding 2 public page shows correct couple name", async ({ page }) => {
    await page.goto(wedding2Routes.home);
    await waitForHydration(page);

    // The page should contain E2E-Test & Partner content
    const pageContent = await page.textContent("body");
    expect(
      pageContent?.includes("E2E-Test") && pageContent?.includes("Partner"),
    ).toBeTruthy();
  });
});

test.describe("Invalid Slug Handling", () => {
  test("invalid slug returns 404", async ({ page }) => {
    const response = await page.goto("/nonexistent-wedding-xyz");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Theme Isolation", () => {
  test("wedding 2 applies sage-garden theme", async ({ page }) => {
    await page.goto(wedding2Routes.home);
    await waitForHydration(page);

    // The sage-garden theme sets --primary to oklch(0.5 0.1 145)
    // Check that theme CSS variables are injected in a <style> tag
    const styleContent = await page
      .locator("style")
      .evaluateAll((styles) => styles.map((s) => s.textContent).join("\n"));
    expect(styleContent).toContain("oklch(0.5 0.1 145)");
  });
});
