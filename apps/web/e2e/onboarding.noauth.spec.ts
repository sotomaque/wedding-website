import { expect, test } from "@playwright/test";
import { waitForHydration } from "./fixtures";

/**
 * Landing Page & Onboarding Tests (No Auth Required)
 */

test.describe("Landing Page", () => {
  test("should show platform branding and hero", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    await expect(page.getByText("Your Wedding,")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show feature cards", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Scroll down to features section to ensure visibility
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check for at least one feature card
    await expect(page.getByText("Guest Management").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have Get Started link pointing to /dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);

    const getStartedLink = page
      .getByRole("link", { name: /get started/i })
      .first();
    await expect(getStartedLink).toBeVisible({ timeout: 10000 });
    await expect(getStartedLink).toHaveAttribute("href", "/dashboard");
  });

  test("Create Your Free Site CTA links to /dashboard", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    const ctaLink = page
      .getByRole("link", { name: /create your free site/i })
      .first();
    await expect(ctaLink).toBeVisible({ timeout: 10000 });
    await expect(ctaLink).toHaveAttribute("href", "/dashboard");
  });

  test("should link to example wedding site", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Check for "View Live Example" link in the hero
    const exampleLink = page
      .getByRole("link", { name: /view live example/i })
      .first();
    await expect(exampleLink).toBeVisible({ timeout: 10000 });
    await expect(exampleLink).toHaveAttribute("href", "/helen-and-enrique");
  });
});

test.describe("404 Page", () => {
  test("shows 404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);

    await expect(page.getByText("404")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
  });
});

test.describe("Dashboard Auth Redirect", () => {
  test("dashboard should redirect unauthenticated user to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});
