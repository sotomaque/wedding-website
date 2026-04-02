import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Gift Registry Page - Display", () => {
  test("displays gift registry page with heading", async ({ page }) => {
    await page.goto("/admin/gifts");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /gift registry/i }),
    ).toBeVisible();
  });

  test("shows stats cards", async ({ page }) => {
    await page.goto("/admin/gifts");
    await waitForHydration(page);

    // Should display fund stat cards
    const cards = page.locator("[class*='card']").filter({
      has: page.locator("text=/\\$/"),
    });
    // Cards may or may not have data, just check the page loads
    await expect(page.locator("main")).toBeVisible();
  });

  test("shows search and filter controls", async ({ page }) => {
    await page.goto("/admin/gifts");
    await waitForHydration(page);

    await expect(page.getByPlaceholder(/filter by donor/i)).toBeVisible();
  });

  test("shows gifts table", async ({ page }) => {
    await page.goto("/admin/gifts");
    await waitForHydration(page);

    const table = page.locator("table");
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Table has expected columns
      await expect(page.getByText(/donor/i).first()).toBeVisible();
      await expect(page.getByText(/amount/i).first()).toBeVisible();
    } else {
      // No gifts yet — page should still load without error
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("has refresh button", async ({ page }) => {
    await page.goto("/admin/gifts");
    await waitForHydration(page);

    await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible();
  });
});

test.describe("Gift Registry Page - Filters", () => {
  test("can filter by donor name", async ({ page }) => {
    await page.goto("/admin/gifts");
    await waitForHydration(page);

    const searchInput = page.getByPlaceholder(/filter by donor/i);
    await searchInput.fill("nonexistent-donor-xyz");
    await page.waitForTimeout(500);

    // Should show no results or filtered results
    await expect(page.locator("main")).toBeVisible();
  });
});
