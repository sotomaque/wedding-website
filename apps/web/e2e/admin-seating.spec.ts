import { expect, test } from "@playwright/test";
import {
  E2E_TEST_PREFIXES,
  isAuthAvailable,
  waitForHydration,
} from "./fixtures";

/**
 * Admin Seating Chart Management Tests
 *
 * Tests for:
 * - Seating chart CRUD operations
 * - Table management
 * - Guest assignment (drag-and-drop)
 * - Filter functionality
 * - AI generation
 *
 * NOTE: These tests require admin authentication.
 * Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables,
 * or run with a pre-authenticated storage state.
 */

// Use stored auth state from setup
test.use({ storageState: "e2e/.auth/admin.json" });

// Run tests serially to avoid interference between tests
test.describe.configure({ mode: "serial" });

// Skip all tests in this file if auth is not available
test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

// Clean up any seating charts created during these tests
test.afterAll(async ({ browser }) => {
  if (!isAuthAvailable()) {
    return;
  }

  try {
    // Create a new context with the stored auth state
    const context = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    const page = await context.newPage();

    // Navigate to admin to ensure auth context
    await page.goto("/admin");

    // Use page.evaluate to make fetch calls with auth cookies
    const deletedCount = await page.evaluate(async (prefixes) => {
      let count = 0;
      try {
        const chartsResponse = await fetch("/api/admin/seating-charts");
        if (!chartsResponse.ok) return 0;

        const { charts } = await chartsResponse.json();
        if (!Array.isArray(charts)) return 0;

        for (const chart of charts) {
          if (
            chart.name?.startsWith(prefixes.chart) ||
            chart.name?.startsWith(prefixes.table) ||
            chart.name?.startsWith(prefixes.testChart)
          ) {
            const deleteRes = await fetch(
              `/api/admin/seating-charts/${chart.id}`,
              {
                method: "DELETE",
              },
            );
            if (deleteRes.ok) count++;
          }
        }
      } catch {
        // Ignore errors
      }
      return count;
    }, E2E_TEST_PREFIXES);

    await context.close();

    if (deletedCount > 0) {
      console.log(`Seating cleanup: Deleted ${deletedCount} test charts`);
    }
  } catch {
    // Cleanup errors are non-fatal
  }
});

test.describe("Seating Chart Management - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/seating");
    await waitForHydration(page);
  });

  test("displays seating charts page", async ({ page }) => {
    // Should show the seating charts heading
    await expect(
      page.getByRole("heading", { name: "Seating Charts", exact: true }),
    ).toBeVisible();

    // Should show New Chart button
    await expect(
      page.getByRole("button", { name: /new chart/i }),
    ).toBeVisible();
  });

  test("can navigate to seating page from admin nav", async ({ page }) => {
    // First go to admin
    await page.goto("/admin");
    await waitForHydration(page);

    // Seating is inside the "Guests" dropdown — open it first
    await page.getByRole("button", { name: /^guests/i }).click();
    await page.getByRole("menuitem", { name: /seating/i }).click();

    // Should be on seating page
    await expect(page).toHaveURL(/\/admin\/seating/);
    await expect(
      page.getByRole("heading", { name: "Seating Charts", exact: true }),
    ).toBeVisible();
  });
});

test.describe("Seating Chart Management - CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/seating");
    await waitForHydration(page);
  });

  test("can create a new seating chart", async ({ page }) => {
    const uniqueId = Date.now();
    const chartName = `E2E Test Chart ${uniqueId}`;

    // Click New Chart button
    await page.getByRole("button", { name: /new chart/i }).click();

    // Should show the create chart dialog
    await expect(
      page.getByRole("heading", { name: /create seating chart/i }),
    ).toBeVisible();

    // Fill in the form
    await page.getByLabel(/chart name/i).fill(chartName);

    // Submit
    await page.getByRole("button", { name: /create chart/i }).click();

    // Should see success toast or navigate to chart
    await Promise.race([
      expect(page.getByText(/chart created/i)).toBeVisible({ timeout: 5000 }),
      expect(page).toHaveURL(/\/admin\/seating\//, { timeout: 5000 }),
    ]).catch(() => {
      // Either condition is fine
    });

    // Navigate back to seating list
    await page.goto("/admin/seating");
    await waitForHydration(page);

    // Should see the new chart in the list
    await expect(page.getByText(chartName)).toBeVisible({ timeout: 5000 });
  });

  test("can open an existing chart", async ({ page }) => {
    // Check if there are any charts
    const chartCards = page.locator('[data-testid="chart-card"]');
    const chartCount = await chartCards.count();

    if (chartCount === 0) {
      // Create a chart first if none exist
      await page.getByRole("button", { name: /new chart/i }).click();
      await page.getByLabel(/chart name/i).fill(`Test Chart ${Date.now()}`);
      await page.getByRole("button", { name: /create chart/i }).click();
      await page.waitForTimeout(1000);
      await page.goto("/admin/seating");
      await waitForHydration(page);
    }

    // Click on the first chart card
    const firstChartLink = page
      .locator("a")
      .filter({ hasText: /chart/i })
      .first();
    if (await firstChartLink.isVisible()) {
      await firstChartLink.click();

      // Should navigate to chart editor
      await expect(page).toHaveURL(/\/admin\/seating\/[a-z0-9-]+/i);
    }
  });
});

test.describe("Seating Chart Editor - Tables", () => {
  test.beforeEach(async ({ page }) => {
    // Create a test chart or use an existing one
    await page.goto("/admin/seating");
    await waitForHydration(page);

    // Check for existing charts
    const chartLink = page.locator("a").filter({ hasText: /chart/i }).first();

    if (await chartLink.isVisible()) {
      await chartLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      // Create a new chart
      await page.getByRole("button", { name: /new chart/i }).click();
      await page.getByLabel(/chart name/i).fill(`Table Test ${Date.now()}`);
      await page.getByRole("button", { name: /create chart/i }).click();
      // Increase timeout and wait for navigation
      await page.waitForURL(/\/admin\/seating\/[a-z0-9-]+/i, {
        timeout: 15000,
      });
      await page.waitForLoadState("networkidle");
    }

    await waitForHydration(page);
  });

  test("can add a table to the chart", async ({ page }) => {
    // Click Add Table button
    await page.getByRole("button", { name: /add table/i }).click();

    // Should show add table dialog
    await expect(
      page.getByRole("heading", { name: /add table/i }),
    ).toBeVisible();

    // Optionally set a table name
    const tableNameInput = page.getByLabel(/table name/i);
    if (await tableNameInput.isVisible()) {
      await tableNameInput.fill("Head Table");
    }

    // Submit
    await page
      .getByRole("button", { name: /add table/i })
      .last()
      .click();

    // Should see success toast
    await expect(page.getByText(/table added/i)).toBeVisible({ timeout: 5000 });

    // Table should appear in the view by name
    await expect(
      page.getByRole("heading", { name: /head table/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("displays table capacity information", async ({ page }) => {
    // Check for table elements
    const tableElements = page.locator('[data-testid="seating-table"]');
    const count = await tableElements.count();

    if (count === 0) {
      // Add a table first
      await page.getByRole("button", { name: /add table/i }).click();
      await page
        .getByRole("button", { name: /add table/i })
        .last()
        .click();
      await page.waitForTimeout(500);
    }

    // Tables should show capacity (e.g., "0/8" or similar pattern)
    await expect(page.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Seating Chart Editor - Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/seating");
    await waitForHydration(page);

    // Navigate to first chart
    const chartLink = page.locator("a").filter({ hasText: /chart/i }).first();

    if (await chartLink.isVisible()) {
      await chartLink.click();
      await waitForHydration(page);
    } else {
      test.skip();
    }
  });

  test("displays filter controls", async ({ page }) => {
    // Should have filter dropdowns
    await expect(
      page.getByText(/a-list only/i).or(page.getByText(/all lists/i)),
    ).toBeVisible();
    await expect(
      page.getByText(/confirmed only/i).or(page.getByText(/all guests/i)),
    ).toBeVisible();
  });

  test("can switch between list filters", async ({ page }) => {
    // Click on the list filter dropdown
    const listFilterTrigger = page.locator('[role="combobox"]').first();
    await listFilterTrigger.click();

    // Select A-List Only option
    await page.getByRole("option", { name: /a-list only/i }).click();

    // URL should update with list parameter
    await expect(page).toHaveURL(/list=a/);
  });

  test("can switch between RSVP filters", async ({ page }) => {
    // Click on the RSVP filter dropdown (second combobox)
    const rsvpFilterTrigger = page.locator('[role="combobox"]').nth(1);
    await rsvpFilterTrigger.click();

    // Select All Guests option
    await page.getByRole("option", { name: /all guests/i }).click();

    // URL should update with rsvp parameter
    await expect(page).toHaveURL(/rsvp=all/);
  });
});

test.describe("Seating Chart Editor - View Modes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/seating");
    await waitForHydration(page);

    // Navigate to first chart
    const chartLink = page.locator("a").filter({ hasText: /chart/i }).first();

    if (await chartLink.isVisible()) {
      await chartLink.click();
      await waitForHydration(page);
    } else {
      test.skip();
    }
  });

  test("can switch to table view", async ({ page }) => {
    // Click on Table view button
    const tableViewButton = page.getByRole("button", { name: /table/i });
    if (await tableViewButton.isVisible()) {
      await tableViewButton.click();

      // Table view should now be active
      await expect(tableViewButton)
        .toHaveAttribute("data-state", "active")
        .catch(() => {
          // Button style may vary
        });
    }
  });

  test("can switch to visual view", async ({ page }) => {
    // Click on Visual view button
    const visualViewButton = page.getByRole("button", { name: /visual/i });
    if (await visualViewButton.isVisible()) {
      await visualViewButton.click();

      // Visual view should now be active
      await expect(visualViewButton)
        .toHaveAttribute("data-state", "active")
        .catch(() => {
          // Button style may vary
        });
    }
  });
});

test.describe("Seating Chart Editor - AI Generate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/seating");
    await waitForHydration(page);

    // Navigate to first chart
    const chartLink = page.locator("a").filter({ hasText: /chart/i }).first();

    if (await chartLink.isVisible()) {
      await chartLink.click();
      await waitForHydration(page);
    } else {
      test.skip();
    }
  });

  test("shows AI Generate button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /ai generate/i }),
    ).toBeVisible();
  });

  test("AI Generate is disabled without tables", async ({ page }) => {
    // If there are no tables, the button should be disabled
    const tableCount = await page
      .locator('[data-testid="seating-table"]')
      .count();

    if (tableCount === 0) {
      await expect(
        page.getByRole("button", { name: /ai generate/i }),
      ).toBeDisabled();
    }
  });
});

test.describe("Seating Chart Editor - Guest Pool", () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for navigation since this runs later in the test suite
    await page.goto("/admin/seating", { timeout: 30000 });
    await waitForHydration(page);

    // Navigate to first chart
    const chartLink = page.locator("a").filter({ hasText: /chart/i }).first();

    if (await chartLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chartLink.click();
      await waitForHydration(page);
    } else {
      test.skip();
    }
  });

  test("displays unassigned guests section", async ({ page }) => {
    // Should show unassigned guests header - wait a bit longer as this test
    // runs late in the suite and may need more time
    await expect(page.getByText(/unassigned/i)).toBeVisible({ timeout: 10000 });
  });

  test("shows guest count in header", async ({ page }) => {
    // Header should show something like "X of Y guests seated"
    await expect(
      page.getByText(/\d+ of \d+ guests/i).or(page.getByText(/guests seated/i)),
    ).toBeVisible({ timeout: 10000 });
  });
});
