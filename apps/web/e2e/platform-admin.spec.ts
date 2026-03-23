import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

/**
 * Platform Admin Tests (Authenticated)
 *
 * Verifies the platform-wide admin dashboard:
 * - Page loads and shows header
 * - Stats cards display aggregate data
 * - Wedding list shows all weddings
 * - View Admin links are present for each wedding
 */

// Use stored auth state from setup
test.use({ storageState: "e2e/.auth/admin.json" });

// Skip all tests in this file if auth is not available
test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Platform Admin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/platform-admin");
    await waitForHydration(page);
  });

  test("should load platform admin page", async ({ page }) => {
    await expect(page.getByText("Platform Admin")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show stats cards", async ({ page }) => {
    await expect(page.getByText("Total Weddings")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Total Guests")).toBeVisible();
  });

  test("should list all weddings", async ({ page }) => {
    // Both the default wedding and the E2E test wedding should appear
    await expect(page.getByText("Helen & Enrique")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("E2E-Test & Partner")).toBeVisible();
  });

  test("should show wedding slugs", async ({ page }) => {
    // Slugs are displayed as /slug in the table
    await expect(page.getByText("/helen-and-enrique")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("/e2e-test-wedding")).toBeVisible();
  });

  test("should have View Admin links for each wedding", async ({ page }) => {
    const viewLinks = page.getByRole("link", { name: /view admin/i });
    // At least 2 weddings should have View Admin links
    const count = await viewLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("should show published status badges", async ({ page }) => {
    // Both seeded weddings are published
    const publishedBadges = page.getByText("published");
    const count = await publishedBadges.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
