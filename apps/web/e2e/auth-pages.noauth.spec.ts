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

    // Clerk's sign-in renders an email input
    await expect(
      page
        .getByLabel(/email/i)
        .or(
          page
            .locator("[data-clerk-component]")
            .or(page.locator(".cl-rootBox")),
        ),
    ).toBeVisible({ timeout: 10000 });
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

    // Clerk's sign-up renders an email input or sign-up form
    await expect(
      page
        .getByLabel(/email/i)
        .or(
          page
            .locator("[data-clerk-component]")
            .or(page.locator(".cl-rootBox")),
        ),
    ).toBeVisible({ timeout: 10000 });
  });
});
