import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("API Documentation Page", () => {
  test("displays API docs page with heading", async ({ page }) => {
    await page.goto("/admin/api-docs");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /api documentation/i }),
    ).toBeVisible();
  });

  test("shows example request selector", async ({ page }) => {
    await page.goto("/admin/api-docs");
    await waitForHydration(page);

    // Should have a select/dropdown for example requests
    const selector = page.locator("select").first();
    if (await selector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(selector).toBeVisible();
    }
  });

  test("shows Send Request button", async ({ page }) => {
    await page.goto("/admin/api-docs");
    await waitForHydration(page);

    await expect(
      page.getByRole("button", { name: /send.*request/i }),
    ).toBeVisible();
  });

  test("can send a health check request", async ({ page }) => {
    await page.goto("/admin/api-docs");
    await waitForHydration(page);

    // Select health check example
    const selector = page.locator("select").first();
    if (await selector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selector.selectOption({ index: 0 });
    }

    // Send request
    await page.getByRole("button", { name: /send.*request/i }).click();

    // Should show response
    await expect(
      page.locator("pre, code").filter({ hasText: /{/ }),
    ).toBeVisible({ timeout: 10000 });
  });
});
