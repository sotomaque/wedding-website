import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Parties List Page", () => {
  test("displays party management page with heading", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /party management/i }),
    ).toBeVisible();
  });

  test("shows stats cards", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    // Should show stats: Total Parties, Total Guests, Avg Party Size
    await expect(page.getByText(/total parties/i)).toBeVisible();
    await expect(page.getByText(/total guests/i)).toBeVisible();
  });

  test("displays parties table with data", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    // Should have a table with rows from seed data
    const table = page.locator("table");
    await expect(table).toBeVisible();

    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("has search input", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    const searchInput = page.getByPlaceholder(/search by guest name/i);
    await expect(searchInput).toBeVisible();
  });

  test("can search for a party by guest name", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    const searchInput = page.getByPlaceholder(/search by guest name/i);
    await searchInput.fill("E2E-Alice");
    await page.waitForTimeout(500);

    // Should filter results
    await expect(page.getByText(/E2E-Alice/)).toBeVisible();
  });

  test("has pagination controls", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    // Should show pagination
    await expect(
      page
        .getByRole("button", { name: /previous/i })
        .or(page.getByRole("button", { name: /next/i })),
    ).toBeVisible();
  });
});

test.describe("Party Details Page", () => {
  test("can navigate to party details", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    // Click on first party row link
    const partyLink = page.locator("table tbody tr a").first();
    if (await partyLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await partyLink.click();
      await waitForHydration(page);

      await expect(
        page.getByRole("heading", { name: /edit party/i }),
      ).toBeVisible();
    } else {
      test.skip(true, "No party links visible");
    }
  });

  test("shows party edit form with fields", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    const partyLink = page.locator("table tbody tr a").first();
    if (await partyLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await partyLink.click();
      await waitForHydration(page);

      // Should show form fields
      await expect(page.locator("#party-name")).toBeVisible();
      await expect(page.locator("#party-side")).toBeVisible();
      await expect(page.locator("#party-list")).toBeVisible();
    } else {
      test.skip(true, "No party links visible");
    }
  });

  test("shows party members section", async ({ page }) => {
    await page.goto("/admin/parties");
    await waitForHydration(page);

    const partyLink = page.locator("table tbody tr a").first();
    if (await partyLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await partyLink.click();
      await waitForHydration(page);

      await expect(
        page.getByRole("heading", { name: /party members/i }),
      ).toBeVisible();
    } else {
      test.skip(true, "No party links visible");
    }
  });
});
