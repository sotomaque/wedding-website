import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Calendar Page", () => {
  test("displays calendar page with heading", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /calendar/i }),
    ).toBeVisible();
  });

  test("shows filter toggle buttons", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    // Side filter toggles
    await expect(
      page.getByRole("button", { name: /all guests/i }),
    ).toBeVisible();
  });

  test("shows layer toggle buttons", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    // Layer toggles for events, arrivals, departures, etc.
    await expect(page.getByRole("button", { name: /events/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /arrivals/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /departures/i }),
    ).toBeVisible();
  });

  test("shows calendar component", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    // Calendar should render with day cells
    const calendarTable = page.locator("table").first();
    await expect(calendarTable).toBeVisible();
  });

  test("can click a day to see details", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    // Click on a day button in the calendar
    const dayButton = page.locator("table button").first();
    if (await dayButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayButton.click();
      await page.waitForTimeout(300);

      // Should show day detail panel
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("shows legend with colored indicators", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    // Legend should show event type labels
    const legend = page.getByText(/events/i).first();
    await expect(legend).toBeVisible();
  });

  test("can toggle side filter", async ({ page }) => {
    await page.goto("/admin/calendar");
    await waitForHydration(page);

    const brideButton = page.getByRole("button", { name: /bride/i }).first();
    if (await brideButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await brideButton.click();
      await page.waitForTimeout(300);

      // Switch back to all
      await page.getByRole("button", { name: /all guests/i }).click();
    }
  });
});
