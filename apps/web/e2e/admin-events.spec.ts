import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Events Page - Display", () => {
  test("displays events page with heading", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  });

  test("shows Add Event button", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    await expect(
      page.getByRole("button", { name: /add event/i }),
    ).toBeVisible();
  });

  test("displays seeded events", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    // Seed data should have at least one event
    const eventCards = page.locator("article, [class*='card']").filter({
      has: page.locator("h2, h3"),
    });
    const count = await eventCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Events Page - CRUD", () => {
  test("can open and close Add Event dialog", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    await page.getByRole("button", { name: /add event/i }).click();

    await expect(
      page.getByRole("heading", { name: /create.*event/i }),
    ).toBeVisible();

    // Close by clicking Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    await expect(
      page.getByRole("heading", { name: /create.*event/i }),
    ).not.toBeVisible();
  });

  test("can create a new event", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    const uniqueId = Date.now();
    const eventName = `E2E Test Event ${uniqueId}`;

    await page.getByRole("button", { name: /add event/i }).click();

    // Fill in event form
    await page.getByLabel(/event name/i).fill(eventName);
    await page.getByLabel(/description/i).fill("Test event created by E2E");

    // Submit
    await page.getByRole("button", { name: /create event/i }).click();

    // Should show success or the new event
    await expect(page.getByText(eventName).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("can delete an event", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    // Count events before
    const eventsBefore = await page
      .getByRole("button", { name: /delete/i })
      .count();

    if (eventsBefore === 0) {
      test.skip(true, "No events to delete");
      return;
    }

    // Click delete on the last event (likely our test event)
    await page
      .getByRole("button", { name: /delete/i })
      .last()
      .click();

    // Confirm deletion
    const confirmButton = page
      .getByRole("button", { name: /confirm|delete|yes/i })
      .last();
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for deletion
    await page.waitForTimeout(1000);

    const eventsAfter = await page
      .getByRole("button", { name: /delete/i })
      .count();
    expect(eventsAfter).toBeLessThan(eventsBefore);
  });
});

test.describe("Event Invites Page", () => {
  test("can navigate to manage invites", async ({ page }) => {
    await page.goto("/admin/events");
    await waitForHydration(page);

    // Look for Manage Invites button
    const manageButton = page
      .getByRole("link", { name: /manage invites/i })
      .first();

    if (await manageButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await manageButton.click();
      await waitForHydration(page);

      await expect(
        page.getByRole("heading", { name: /manage invites/i }),
      ).toBeVisible();
    } else {
      // If no Manage Invites link, skip
      test.skip(true, "No non-default events with Manage Invites link");
    }
  });
});
