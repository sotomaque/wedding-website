import * as fs from "node:fs";
import { test as teardown } from "@playwright/test";
import { E2E_TEST_PREFIXES } from "./fixtures";

const testDataFile = "e2e/.auth/test-data.json";

/**
 * Teardown: Clean up all E2E test data
 *
 * This runs after all tests and deletes:
 * - All guests with names starting with "E2E-"
 * - All seating charts with names starting with "E2E Test Chart", "Table Test", or "Test Chart"
 */
teardown("clean up all E2E test data", async ({ page }) => {
  console.log("Starting E2E test data cleanup...");

  // Navigate to admin page first to ensure we have auth context
  await page.goto("/admin");

  // Use page.evaluate to make fetch calls from within the authenticated browser context
  const cleanupResult = await page.evaluate(async (prefixes) => {
    const results = {
      guestsDeleted: 0,
      chartsDeleted: 0,
      errors: [] as string[],
    };

    // Clean up test guests
    try {
      const guestsResponse = await fetch("/api/admin/guests");
      if (guestsResponse.ok) {
        const data = await guestsResponse.json();
        const guests = data.guests || [];

        const e2eGuests = guests.filter((g: { first_name: string }) =>
          g.first_name?.startsWith(prefixes.guest),
        );

        for (const guest of e2eGuests) {
          try {
            const deleteResponse = await fetch(
              `/api/admin/guests?id=${guest.id}`,
              {
                method: "DELETE",
              },
            );
            if (deleteResponse.ok) {
              results.guestsDeleted++;
            }
          } catch {
            results.errors.push(`Failed to delete guest ${guest.first_name}`);
          }
        }
      }
    } catch (err) {
      results.errors.push(`Error fetching guests: ${err}`);
    }

    // Clean up test seating charts
    try {
      const chartsResponse = await fetch("/api/admin/seating-charts");
      if (chartsResponse.ok) {
        const data = await chartsResponse.json();
        const charts = data.charts || [];

        const e2eCharts = charts.filter(
          (c: { name: string }) =>
            c.name?.startsWith(prefixes.chart) ||
            c.name?.startsWith(prefixes.table) ||
            c.name?.startsWith(prefixes.testChart),
        );

        for (const chart of e2eCharts) {
          try {
            const deleteResponse = await fetch(
              `/api/admin/seating-charts/${chart.id}`,
              {
                method: "DELETE",
              },
            );
            if (deleteResponse.ok) {
              results.chartsDeleted++;
            }
          } catch {
            results.errors.push(`Failed to delete chart ${chart.name}`);
          }
        }
      }
    } catch (err) {
      results.errors.push(`Error fetching charts: ${err}`);
    }

    return results;
  }, E2E_TEST_PREFIXES);

  if (cleanupResult.guestsDeleted > 0) {
    console.log(`Deleted ${cleanupResult.guestsDeleted} E2E test guests`);
  }
  if (cleanupResult.chartsDeleted > 0) {
    console.log(`Deleted ${cleanupResult.chartsDeleted} E2E test charts`);
  }
  if (cleanupResult.errors.length > 0) {
    console.warn("Cleanup errors:", cleanupResult.errors);
  }

  // Clean up test data file
  try {
    fs.unlinkSync(testDataFile);
    console.log("Cleaned up test data file");
  } catch {
    // File might not exist
  }

  console.log("E2E test data cleanup complete");
});
