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

  test("can add an RSVP reminder", async ({ page }) => {
    // Use a unique number to avoid conflicts with previous runs
    const uniqueDays = String(50 + Math.floor(Math.random() * 40));

    await page.getByPlaceholder(/days before deadline/i).fill(uniqueDays);
    await page.getByRole("button", { name: /add/i }).click();

    // Verify it appears in the list
    await expect(
      page.getByText(new RegExp(`${uniqueDays} days? before deadline`)),
    ).toBeVisible({ timeout: 10000 });

    // Clean up via API to avoid accumulation
    const cookies = await page.context().cookies();
    const baseUrl = page.url().split("/admin")[0];
    await page.evaluate(
      async ({ baseUrl, uniqueDays }) => {
        const res = await fetch(`${baseUrl}/api/admin/reminders`);
        const data = await res.json();
        const match = data.schedules?.find(
          (s: { daysBeforeDeadline: number }) =>
            s.daysBeforeDeadline === Number(uniqueDays),
        );
        if (match) {
          await fetch(`${baseUrl}/api/admin/reminders`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: match.id }),
          });
        }
      },
      { baseUrl, uniqueDays },
    );
  });

  test("can save admin summary settings", async ({ page }) => {
    await page.getByRole("button", { name: /save summary settings/i }).click();

    await expect(
      page.getByRole("button", { name: /save summary settings/i }),
    ).toBeEnabled({ timeout: 10000 });
  });
});
