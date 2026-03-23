import { expect, test } from "@playwright/test";
import { waitForHydration } from "./fixtures";

/**
 * Landing Page & Onboarding Tests (No Auth Required)
 *
 * Verifies:
 * - Landing page renders platform features
 * - Call-to-action links are present
 * - Example site link points to the default wedding
 * - Dashboard redirects unauthenticated users to sign-in
 */

test.describe("Landing Page", () => {
  test("should show platform branding and hero", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Hero section with main headline
    await expect(page.getByText("Your Wedding,")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show feature cards", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Feature titles from the FEATURES array on the landing page
    await expect(page.getByText("Guest Management")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Email Invitations")).toBeVisible();
    await expect(page.getByText("Live Photo Sharing")).toBeVisible();
    await expect(page.getByText("Gift Registry")).toBeVisible();
  });

  test("should have Get Started link", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const getStartedLink = page.getByRole("link", { name: /get started/i });
    await expect(getStartedLink).toBeVisible({ timeout: 10000 });
    await expect(getStartedLink).toHaveAttribute("href", "/sign-up");
  });

  test("should link to example wedding site", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // The "See It in Action" or "View Live Example" link
    const exampleLink = page.getByRole("link", {
      name: /see it in action|view live example/i,
    });
    await expect(exampleLink).toBeVisible({ timeout: 10000 });
    await expect(exampleLink).toHaveAttribute("href", "/helen-and-enrique");
  });
});

test.describe("Dashboard Auth Redirect", () => {
  test("dashboard should redirect unauthenticated user to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Clerk middleware should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});
