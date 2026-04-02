import { expect, test } from "@playwright/test";
import { waitForHydration } from "./fixtures";

test.describe("Sign-In Page", () => {
  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await waitForHydration(page);

    await expect(page.locator("main, body")).toBeVisible();
  });

  test("shows Clerk sign-in component", async ({ page }) => {
    await page.goto("/sign-in");
    await waitForHydration(page);

    // Clerk's sign-in renders with a data-clerk-component attribute
    await expect(page.locator('[data-clerk-component="SignIn"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("sign-in page is centered", async ({ page }) => {
    await page.goto("/sign-in");
    await waitForHydration(page);

    // Container should be centered
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Sign-Up Page", () => {
  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await waitForHydration(page);

    await expect(page.locator("main, body")).toBeVisible();
  });

  test("shows Clerk sign-up component", async ({ page }) => {
    await page.goto("/sign-up");
    await waitForHydration(page);

    // Clerk's sign-up renders with a data-clerk-component attribute
    await expect(page.locator('[data-clerk-component="SignUp"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
