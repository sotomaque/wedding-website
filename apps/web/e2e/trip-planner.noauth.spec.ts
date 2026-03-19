import { expect, test } from "@playwright/test";
import { TEST_DATA, waitForHydration } from "./fixtures";

test.describe("Trip Planner - Public Access", () => {
  test("page loads and shows calendar", async ({ page }) => {
    await page.goto("/trip-planner");
    await waitForHydration(page);

    // Page renders with heading
    await expect(
      page.getByRole("heading", { name: /trip planner/i }),
    ).toBeVisible();

    // Calendar is rendered
    await expect(page.locator("table")).toBeVisible();
  });

  test("shows guest identifier when not authenticated", async ({ page }) => {
    await page.goto("/trip-planner");
    await waitForHydration(page);

    // Guest identifier search should be visible
    await expect(page.getByPlaceholder(/type your name/i)).toBeVisible();
  });

  test("toggle buttons are visible and interactive", async ({ page }) => {
    await page.goto("/trip-planner");
    await waitForHydration(page);

    // Check toggle buttons exist
    await expect(page.getByRole("button", { name: /events/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /activities/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /stay overview/i }),
    ).toBeVisible();

    // Click a toggle to verify interaction
    const activitiesBtn = page.getByRole("button", { name: /activities/i });
    await activitiesBtn.click();

    // Button should now have line-through (disabled state)
    await expect(activitiesBtn).toHaveClass(/line-through/);

    // Click again to re-enable
    await activitiesBtn.click();
    await expect(activitiesBtn).not.toHaveClass(/line-through/);
  });

  test("legend shows dot labels", async ({ page }) => {
    await page.goto("/trip-planner");
    await waitForHydration(page);

    await expect(page.getByText("Events")).toBeVisible();
    await expect(page.getByText("Arrivals")).toBeVisible();
    await expect(page.getByText("Departures")).toBeVisible();
  });

  test("clicking a day shows detail panel", async ({ page }) => {
    await page.goto("/trip-planner");
    await waitForHydration(page);

    // Initially shows "Click a day to see details"
    await expect(page.getByText(/click a day to see details/i)).toBeVisible();

    // Click any day button in the calendar
    const dayButtons = page.locator("table button");
    const firstDay = dayButtons.first();
    await firstDay.click();

    // Detail panel should now show a date heading instead of the placeholder
    await expect(
      page.getByText(/click a day to see details/i),
    ).not.toBeVisible();
  });

  test("is accessible from main navigation", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // Find and click the Trip Planner nav link
    const navLink = page.getByRole("link", { name: /trip planner/i });
    await expect(navLink).toBeVisible();
    await navLink.click();

    // Should navigate to the trip planner page
    await expect(page).toHaveURL(/trip-planner/);
    await expect(
      page.getByRole("heading", { name: /trip planner/i }),
    ).toBeVisible();
  });
});
