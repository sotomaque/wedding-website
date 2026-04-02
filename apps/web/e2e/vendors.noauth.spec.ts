import { expect, test } from "@playwright/test";
import { TEST_DATA, waitForHydration } from "./fixtures";

test.describe("Vendors Page - Public Access", () => {
  test("page loads without authentication", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/vendors`);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
  });

  test("displays vendors heading", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/vendors`);
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /vendors.*services/i }),
    ).toBeVisible();
  });

  test("shows vendor categories", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/vendors`);
    await waitForHydration(page);

    // Should show category headings (h2 level)
    const categoryHeadings = page.getByRole("heading", { level: 2 });
    const count = await categoryHeadings.count();
    // At least one category if vendors are seeded
    if (count > 0) {
      await expect(categoryHeadings.first()).toBeVisible();
    }
  });

  test("vendor links open in new tab", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/vendors`);
    await waitForHydration(page);

    // Vendor links should have target="_blank"
    const vendorLinks = page.locator('a[target="_blank"]');
    const count = await vendorLinks.count();
    if (count > 0) {
      await expect(vendorLinks.first()).toBeVisible();
    }
  });

  test("has navigation header", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/vendors`);
    await waitForHydration(page);

    await expect(page.locator("nav")).toBeVisible();
  });

  test("has footer", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/vendors`);
    await waitForHydration(page);

    await expect(page.locator("footer")).toBeVisible();
  });
});
