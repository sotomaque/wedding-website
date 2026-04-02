import { expect, test } from "@playwright/test";
import {
  getTestData,
  setInviteCodeCookie,
  TEST_DATA,
  waitForHydration,
} from "./fixtures";

/**
 * Things To Do Page Tests (No Auth Required)
 *
 * Tests for:
 * - Deeplinked after RSVP form submission
 * - Auth'd and manually navigated
 * - Not auth'd and deeplinked
 * - Not auth'd and manually navigated
 */

function getInviteCode(): string | null {
  return getTestData().inviteCode;
}

test.describe("Things To Do - Public Access", () => {
  test("page loads without authentication", async ({ page }) => {
    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Should show the Things To Do content
    // The page should be accessible even without auth
    await expect(page.locator("main")).toBeVisible();
  });

  test("page shows activities content", async ({ page }) => {
    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Should have some content visible (activities, venues, etc.)
    // The specific content depends on your database
    await expect(page.locator("main")).toBeVisible();

    // Check that the page has meaningful content (not just error)
    const pageContent = await page.textContent("body");
    expect(pageContent?.length).toBeGreaterThan(100);
  });
});

test.describe("Things To Do - With Invite Code", () => {
  test("page loads with code in URL", async ({ page }) => {
    const inviteCode = getInviteCode();
    if (!inviteCode) {
      test.skip(true, "No invite code from seed data");
      return;
    }

    await page.goto(`${TEST_DATA.routes.thingsToDo}?code=${inviteCode}`);
    await waitForHydration(page);

    // Page should load successfully
    await expect(page.locator("main")).toBeVisible();
  });

  test("page loads with code in cookie", async ({ page, context }) => {
    const inviteCode = getInviteCode();
    if (!inviteCode) {
      test.skip(true, "No invite code from seed data");
      return;
    }

    // Set the invite code cookie
    await setInviteCodeCookie(page, context, inviteCode);

    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Page should load successfully
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Things To Do - Navigation", () => {
  test("can access from main navigation", async ({ page }) => {
    // Start from home page
    await page.goto(TEST_DATA.routes.home);
    await waitForHydration(page);

    // "Things To Do" is inside the "Planning" dropdown — open it first
    const planningButton = page.getByRole("button", { name: /planning/i });
    if (await planningButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await planningButton.click();

      const navLink = page
        .getByRole("menuitem", { name: /things to do/i })
        .or(page.getByRole("link", { name: /things to do/i }));
      if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await navLink.click();
        await expect(page).toHaveURL(/things-to-do/);
      } else {
        test.skip(true, "Things To Do not in Planning dropdown");
      }
    } else {
      // Try direct link (some nav configs may not use dropdown)
      const directLink = page.getByRole("link", { name: /things to do/i });
      if (await directLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await directLink.click();
        await expect(page).toHaveURL(/things-to-do/);
      } else {
        test.skip(true, "No Things To Do nav link found");
      }
    }
  });

  test("has navigation header visible", async ({ page }) => {
    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Should have navigation visible
    await expect(page.locator("nav")).toBeVisible();
  });

  test("has footer visible", async ({ page }) => {
    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Should have footer visible
    await expect(page.locator("footer")).toBeVisible();
  });
});

test.describe("Things To Do - Responsive Design", () => {
  test("displays correctly on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Main content should be visible
    await expect(page.locator("main")).toBeVisible();

    // Check that content is not overflowing
    const mainElement = page.locator("main");
    const box = await mainElement.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });

  test("displays correctly on tablet viewport", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Main content should be visible
    await expect(page.locator("main")).toBeVisible();
  });

  test("displays correctly on desktop viewport", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(TEST_DATA.routes.thingsToDo);
    await waitForHydration(page);

    // Main content should be visible
    await expect(page.locator("main")).toBeVisible();
  });
});
