import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Templates List Page", () => {
  test("displays templates page with heading", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /email templates/i }),
    ).toBeVisible();
  });

  test("shows language filter buttons", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await expect(page.getByRole("button", { name: /english/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /spanish/i })).toBeVisible();
  });

  test("displays template cards with View and Edit buttons", async ({
    page,
  }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    // Should have at least one template
    const viewButtons = page.getByRole("link", { name: /view/i });
    const count = await viewButtons.count();
    expect(count).toBeGreaterThan(0);

    const editButtons = page.getByRole("link", { name: /edit/i });
    const editCount = await editButtons.count();
    expect(editCount).toBeGreaterThan(0);
  });

  test("can toggle template active status", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    // Find the first toggle switch
    const toggle = page.getByRole("switch").first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      const wasBefore = await toggle.isChecked();
      await toggle.click();
      await page.waitForTimeout(1000);

      // Toggle back to restore state
      await toggle.click();
      await page.waitForTimeout(500);
    }
  });

  test("can switch between language filters", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    // Click Spanish
    await page.getByRole("button", { name: /spanish/i }).click();
    await page.waitForTimeout(500);

    // Click back to English
    await page.getByRole("button", { name: /english/i }).click();
    await page.waitForTimeout(500);
  });
});

test.describe("Template View Page", () => {
  test("can navigate to template view", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /view/i }).first().click();
    await waitForHydration(page);

    // Should show Back to Templates link
    await expect(page.getByText(/back to templates/i)).toBeVisible();
  });

  test("shows template preview iframe", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /view/i }).first().click();
    await waitForHydration(page);

    // Should have an iframe for preview
    await expect(
      page.locator('iframe[title="Template Preview"]'),
    ).toBeVisible();
  });

  test("shows template toggle and edit button", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /view/i }).first().click();
    await waitForHydration(page);

    await expect(page.getByRole("switch")).toBeVisible();
    await expect(page.getByRole("link", { name: /edit/i })).toBeVisible();
  });
});

test.describe("Template Editor Page", () => {
  test("can navigate to template editor", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /edit/i }).first().click();
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /edit template/i }),
    ).toBeVisible();
  });

  test("shows subject and HTML body fields", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /edit/i }).first().click();
    await waitForHydration(page);

    await expect(page.locator("#subject")).toBeVisible();
    await expect(page.locator("#htmlBody")).toBeVisible();
  });

  test("shows Save and Preview buttons", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /edit/i }).first().click();
    await waitForHydration(page);

    await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /preview/i })).toBeVisible();
  });

  test("can toggle preview", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /edit/i }).first().click();
    await waitForHydration(page);

    // Show preview
    await page.getByRole("button", { name: /show preview/i }).click();

    await expect(
      page.locator('iframe[title="Template Preview"]'),
    ).toBeVisible();

    // Hide preview
    await page.getByRole("button", { name: /hide preview/i }).click();

    await expect(
      page.locator('iframe[title="Template Preview"]'),
    ).not.toBeVisible();
  });

  test("shows AI Draft button", async ({ page }) => {
    await page.goto("/admin/templates");
    await waitForHydration(page);

    await page.getByRole("link", { name: /edit/i }).first().click();
    await waitForHydration(page);

    await expect(page.getByRole("button", { name: /ai draft/i })).toBeVisible();
  });
});
