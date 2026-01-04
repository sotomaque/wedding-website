import * as fs from "node:fs";
import { expect, test as teardown } from "@playwright/test";

const testDataFile = "e2e/.auth/test-data.json";

/**
 * Teardown: Clean up test data
 *
 * This runs after all tests and deletes the test guest that was created during setup.
 */
teardown("delete test guest", async ({ page }) => {
  // Read test data
  let testData: { testGuestName?: string } = {};
  try {
    const data = fs.readFileSync(testDataFile, "utf-8");
    testData = JSON.parse(data);
  } catch {
    console.log("No test data file found, skipping cleanup");
    return;
  }

  if (!testData.testGuestName) {
    console.log("No test guest to clean up");
    return;
  }

  const adminEmail = process.env.TEST_ADMIN_EMAIL;
  const adminPassword = process.env.TEST_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn("Cannot clean up: admin credentials not set");
    return;
  }

  // Use stored auth state
  try {
    await page.context().storageState({ path: "e2e/.auth/admin.json" });
  } catch {
    // Auth state might not exist, need to login
    await page.goto("/sign-in");
    await page.waitForSelector('[data-clerk-component="sign-in"]', {
      timeout: 10000,
    });
    await page.getByLabel("Email address").fill(adminEmail);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
      timeout: 30000,
    });
  }

  // Navigate to guests page
  await page.goto("/admin/guests");

  // Search for the test guest
  await page.getByPlaceholder(/filter by name/i).fill(testData.testGuestName);

  // Wait for search results
  await page.waitForTimeout(500);

  // Check if guest exists
  const guestRow = page.locator("table tbody tr").first();
  const rowCount = await page.locator("table tbody tr").count();

  if (
    rowCount === 0 ||
    (await page.getByText(/no guests found/i).isVisible())
  ) {
    console.log("Test guest already deleted or not found");
    return;
  }

  // Click the Edit button in the row
  const editButton = guestRow.getByRole("button", { name: /edit/i });
  await editButton.click({ force: true });

  // Wait for edit sheet
  await expect(page.getByRole("heading", { name: /edit guest/i })).toBeVisible({
    timeout: 10000,
  });

  // Click Delete button
  await page.getByRole("button", { name: /delete guest/i }).click();

  // Confirm deletion
  await expect(
    page.getByRole("heading", { name: /are you sure/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^delete$/i }).click();

  // Wait for deletion to complete
  await expect(page.getByText(/guest deleted/i)).toBeVisible({
    timeout: 10000,
  });

  console.log(`Test guest ${testData.testGuestName} deleted`);

  // Clean up test data file
  try {
    fs.unlinkSync(testDataFile);
  } catch {
    // File might not exist
  }
});
