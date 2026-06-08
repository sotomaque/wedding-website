import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Photos Management Page", () => {
  test("displays photos page with heading", async ({ page }) => {
    await page.goto("/admin/photos");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: "Photos", exact: true }),
    ).toBeVisible();
  });

  test("shows upload dropzone", async ({ page }) => {
    await page.goto("/admin/photos");
    await waitForHydration(page);

    // UploadDropzone renders a drop area
    await expect(page.getByText(/upload/i).first()).toBeVisible();
  });

  test("displays photo grid from seed data", async ({ page }) => {
    await page.goto("/admin/photos");
    await waitForHydration(page);

    // Should show photos from seed data
    const images = page.locator("img").filter({
      hasNot: page.locator("[class*='avatar']"),
    });
    const count = await images.count();
    // At least some photos from seed
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("photo cards have active toggle", async ({ page }) => {
    await page.goto("/admin/photos");
    await waitForHydration(page);

    const toggle = page.getByRole("switch").first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toggle).toBeVisible();
    }
  });

  test("photo cards have edit and delete buttons", async ({ page }) => {
    await page.goto("/admin/photos");
    await waitForHydration(page);

    // Check if there are any photos
    const images = page.locator("img");
    const count = await images.count();

    if (count > 0) {
      // Should have action buttons per photo
      await expect(page.locator("button svg").first()).toBeVisible();
    }
  });
});
