import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Documents Page", () => {
  test("displays document center with heading", async ({ page }) => {
    await page.goto("/admin/documents");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /document center/i }),
    ).toBeVisible();
  });

  test("shows upload dropzone", async ({ page }) => {
    await page.goto("/admin/documents");
    await waitForHydration(page);

    await expect(page.getByText(/upload document/i)).toBeVisible();
  });

  test("shows search input", async ({ page }) => {
    await page.goto("/admin/documents");
    await waitForHydration(page);

    await expect(page.getByPlaceholder(/search by title/i)).toBeVisible();
  });

  test("shows category filter buttons", async ({ page }) => {
    await page.goto("/admin/documents");
    await waitForHydration(page);

    await expect(page.getByRole("button", { name: /^all$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /contract/i })).toBeVisible();
  });

  test("can switch category filters", async ({ page }) => {
    await page.goto("/admin/documents");
    await waitForHydration(page);

    // Click a category filter
    await page.getByRole("button", { name: /contract/i }).click();
    await page.waitForTimeout(300);

    // Click back to All
    await page.getByRole("button", { name: /^all$/i }).click();
    await page.waitForTimeout(300);
  });

  test("shows empty state or document list", async ({ page }) => {
    await page.goto("/admin/documents");
    await waitForHydration(page);

    // Either shows documents or empty state
    const hasDocuments = await page
      .locator("[class*='card']")
      .filter({ has: page.locator("svg") })
      .count();

    const hasEmptyState = await page
      .getByText(/no documents/i)
      .isVisible()
      .catch(() => false);

    expect(hasDocuments > 0 || hasEmptyState).toBe(true);
  });
});
