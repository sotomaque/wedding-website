import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Automated Emails Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/settings");
    await waitForHydration(page);
    await page.getByRole("button", { name: /automated emails/i }).click();
  });

  test("displays RSVP reminders and admin summary sections", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /rsvp reminders/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/days before deadline/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /admin summary email/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save summary settings/i }),
    ).toBeVisible();
  });

  test("can add and remove an RSVP reminder", async ({ page }) => {
    const uniqueDays = "99";

    // Add a reminder
    await page.getByPlaceholder(/days before deadline/i).fill(uniqueDays);
    await page.getByRole("button", { name: /add/i }).click();

    // Wait for the reminder to appear in the DOM (more reliable than toast)
    await expect(
      page.getByText(`${uniqueDays} days before deadline`),
    ).toBeVisible({ timeout: 10000 });

    // Delete it
    const reminderRow = page
      .locator("div")
      .filter({ hasText: `${uniqueDays} days before deadline` })
      .first();
    await reminderRow.getByRole("button").last().click();

    // Wait for the reminder to disappear from the DOM
    await expect(
      page.getByText(`${uniqueDays} days before deadline`),
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("can save admin summary settings", async ({ page }) => {
    await page.getByRole("button", { name: /save summary settings/i }).click();

    // Verify the save completed (button re-enables after transition)
    await expect(
      page.getByRole("button", { name: /save summary settings/i }),
    ).toBeEnabled({ timeout: 10000 });
  });
});
