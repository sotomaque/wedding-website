import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Content Editor Page", () => {
  test("displays content editor with heading", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await expect(
      page.getByRole("heading", { name: /content editor/i }),
    ).toBeVisible();
  });

  test("shows section tabs", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await expect(
      page.getByRole("button", { name: "Hero", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Story", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Details", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Schedule", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "RSVP", exact: true }),
    ).toBeVisible();
  });

  test("Hero tab shows title input and save button", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    // Hero tab should be active by default or click it
    await page.getByRole("button", { name: "Hero", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator("#hero-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save hero/i }),
    ).toBeVisible();
  });

  test("can switch to Story tab", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Story", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator("#story-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save story/i }),
    ).toBeVisible();
  });

  test("Story tab shows AI Write button", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Story", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.getByRole("button", { name: /ai write/i })).toBeVisible();
  });

  test("can switch to Details tab", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Details", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator("#details-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save details/i }),
    ).toBeVisible();
  });

  test("Details tab shows ceremony and reception fields", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Details", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator("#ceremony-venue")).toBeVisible();
    await expect(page.locator("#reception-venue")).toBeVisible();
  });

  test("can switch to Schedule tab", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Schedule", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator("#schedule-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save schedule/i }),
    ).toBeVisible();
  });

  test("can switch to RSVP tab", async ({ page }) => {
    await page.goto("/admin/content");
    await waitForHydration(page);

    await page.getByRole("button", { name: "RSVP", exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.locator("#rsvp-title")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save rsvp/i }),
    ).toBeVisible();
  });
});
