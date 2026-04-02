import { expect, test } from "@playwright/test";
import { TEST_DATA, waitForHydration } from "./fixtures";

test.describe("Hotels Page - Public Access", () => {
  test("page loads without authentication", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
  });

  test("displays Where to Stay heading", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /where to stay/i }),
    ).toBeVisible();
  });

  test("shows seeded hotel cards", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    // Seed data includes 2 hotels
    await expect(page.getByText("E2E Luxury Resort")).toBeVisible();
    await expect(page.getByText("E2E Budget Inn")).toBeVisible();
  });

  test("hotel cards have interest buttons", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(
      page.getByRole("button", { name: /interested/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /booked/i }).first(),
    ).toBeVisible();
  });

  test("shows group booking section", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /group booking/i }),
    ).toBeVisible();
  });

  test("has navigation header", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(page.locator("nav")).toBeVisible();
  });

  test("has footer", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(page.locator("footer")).toBeVisible();
  });
});

test.describe("Hotels Page - Responsive Design", () => {
  test("displays correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
  });

  test("displays correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${TEST_DATA.routes.home}/hotels`);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
  });
});
