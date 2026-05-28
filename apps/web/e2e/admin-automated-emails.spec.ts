import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Automated Emails Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Settings page is now tab-organized. Automated emails lives as a
    // subsection under the Notifications tab — open that tab first.
    await page.goto("/admin/settings");
    await waitForHydration(page);
    await page
      .getByRole("button", { name: "Notifications", exact: true })
      .click();
    // The Automated emails subsection mounts when the tab is shown; wait
    // for its heading before any spec body asserts on its inner content.
    await expect(
      page.getByRole("heading", { name: /automated emails/i }),
    ).toBeVisible();
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
    await page.getByPlaceholder(/days before deadline/i).fill("42");
    await page.getByRole("button", { name: /add/i }).click();

    // Verify it appears in the list
    await expect(page.getByText("42 days before deadline")).toBeVisible({
      timeout: 10000,
    });
  });

  test("can save admin summary settings", async ({ page }) => {
    await page.getByRole("button", { name: /save summary settings/i }).click();

    await expect(
      page.getByRole("button", { name: /save summary settings/i }),
    ).toBeEnabled({ timeout: 10000 });
  });
});
