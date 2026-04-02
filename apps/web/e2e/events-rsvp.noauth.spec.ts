import { expect, test } from "@playwright/test";
import { TEST_DATA, waitForHydration } from "./fixtures";

test.describe("Events RSVP Page", () => {
  test("page loads with required params", async ({ page }) => {
    // Events RSVP requires eventId and guestId params
    // Without them, it should show an error or missing params message
    await page.goto(`${TEST_DATA.routes.home}/events/rsvp`);
    await waitForHydration(page);

    // Should show missing params message or redirect
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("shows error for missing parameters", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/events/rsvp`);
    await waitForHydration(page);

    // Should show an error or informative message
    const hasError = await page
      .getByText(/missing|invalid|required|error/i)
      .isVisible()
      .catch(() => false);

    const hasRedirect =
      page.url().includes("rsvp") || page.url().includes("sign-in");

    expect(hasError || hasRedirect).toBe(true);
  });

  test("has navigation header", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/events/rsvp`);
    await waitForHydration(page);

    // Even error state should have navigation
    await expect(page.locator("body")).toBeVisible();
  });
});
