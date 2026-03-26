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
    // Click the Automated Emails tab
    await page.getByRole("button", { name: /automated emails/i }).click();
  });

  test("displays RSVP reminders section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /rsvp reminders/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/days before deadline/i)).toBeVisible();
  });

  test("displays admin summary section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /admin summary email/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save summary settings/i }),
    ).toBeVisible();
  });

  test("can add and remove an RSVP reminder", async ({ page }) => {
    // Add a reminder for 15 days before deadline
    await page.getByPlaceholder(/days before deadline/i).fill("15");
    await page.getByRole("button", { name: /add/i }).click();

    // Should show success toast
    await expect(page.getByText(/reminder added/i)).toBeVisible({
      timeout: 5000,
    });

    // Should show the new reminder in the list
    await expect(page.getByText(/15 days before deadline/i)).toBeVisible();

    // Delete it
    const reminderRow = page
      .locator("div")
      .filter({ hasText: /15 days before deadline/i })
      .first();
    await reminderRow.getByRole("button").last().click();

    // Should show success toast
    await expect(page.getByText(/reminder removed/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("can toggle admin summary on and save", async ({ page }) => {
    // Toggle the switch
    const toggle = page.locator("#summary-enabled");
    await toggle.click();

    // Save
    await page.getByRole("button", { name: /save summary settings/i }).click();

    // Should show success toast
    await expect(page.getByText(/admin summary settings saved/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("prevents duplicate reminder days", async ({ page }) => {
    // Add a reminder for 7 days
    await page.getByPlaceholder(/days before deadline/i).fill("7");
    await page.getByRole("button", { name: /add/i }).click();
    await expect(page.getByText(/reminder added/i)).toBeVisible({
      timeout: 5000,
    });

    // Try to add the same again
    await page.getByPlaceholder(/days before deadline/i).fill("7");
    await page.getByRole("button", { name: /add/i }).click();

    // Should show error
    await expect(page.getByText(/already exists/i)).toBeVisible({
      timeout: 5000,
    });

    // Clean up — delete the reminder
    const reminderRow = page
      .locator("div")
      .filter({ hasText: /7 days before deadline/i })
      .first();
    await reminderRow.getByRole("button").last().click();
  });
});
