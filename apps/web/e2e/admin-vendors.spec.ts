import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

/**
 * Admin Vendors & Links Tests
 *
 * Tests for:
 * - Page loads and displays correctly
 * - Adding a vendor link
 * - Editing a vendor link
 * - Deleting a vendor link
 * - Category filter
 *
 * NOTE: Requires admin authentication.
 */

test.use({ storageState: "e2e/.auth/admin.json" });
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Admin Vendors Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/vendors");
    await waitForHydration(page);
  });

  test("displays vendors page with heading and Add Link button", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /vendors & links/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /add link/i })).toBeVisible();
  });

  test("shows category filter buttons", async ({ page }) => {
    const filters = [
      "All",
      "Venue",
      "Catering",
      "Photography",
      "Music / DJ",
      "Flowers",
      "Other",
    ];
    for (const label of filters) {
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("can open and cancel the add form", async ({ page }) => {
    await page.getByRole("button", { name: /add link/i }).click();
    await expect(page.getByText(/new vendor link/i)).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText(/new vendor link/i)).not.toBeVisible();
  });

  test("shows validation error when submitting empty title", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /add link/i }).click();
    await page
      .getByRole("button", { name: /^add link$/i })
      .last()
      .click();
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test("shows validation error when submitting without URL", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /add link/i }).click();
    await page.getByLabel(/title/i).fill("My Vendor");
    await page
      .getByRole("button", { name: /^add link$/i })
      .last()
      .click();
    await expect(page.getByText(/url is required/i)).toBeVisible();
  });

  test("can add a new vendor link", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `E2E-Vendor-${uniqueId}`;

    await page.getByRole("button", { name: /add link/i }).click();
    await page.getByLabel(/title \*/i).fill(title);
    await page.getByLabel(/url \*/i).fill("https://example.com");

    await page
      .getByRole("button", { name: /^add link$/i })
      .last()
      .click();

    // Wait for success toast or form to close
    await Promise.race([
      expect(page.getByText(/link added/i)).toBeVisible({ timeout: 5000 }),
      expect(page.getByText(/new vendor link/i)).not.toBeVisible({
        timeout: 5000,
      }),
    ]).catch(() => {});

    await page.waitForLoadState("networkidle");

    // Verify the link appears in the list
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
  });

  test("can edit an existing vendor link", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `E2E-Edit-${uniqueId}`;

    // Create a link first
    await page.getByRole("button", { name: /add link/i }).click();
    await page.getByLabel(/title \*/i).fill(title);
    await page.getByLabel(/url \*/i).fill("https://example.com");
    await page
      .getByRole("button", { name: /^add link$/i })
      .last()
      .click();

    await Promise.race([
      expect(page.getByText(/link added/i)).toBeVisible({ timeout: 5000 }),
      expect(page.getByText(/new vendor link/i)).not.toBeVisible({
        timeout: 5000,
      }),
    ]).catch(() => {});
    await page.waitForLoadState("networkidle");

    // Find the row with our link and click its edit (pencil) button
    const linkRow = page
      .locator(".border.rounded-lg")
      .filter({ hasText: title });
    await expect(linkRow).toBeVisible({ timeout: 10000 });
    await linkRow
      .getByRole("button", { name: "" })
      .filter({ has: page.locator("svg") })
      .nth(2)
      .click();

    // Inline edit form should appear
    const titleInput = linkRow.getByLabel(/title/i);
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    const editedTitle = `${title}-edited`;
    await titleInput.clear();
    await titleInput.fill(editedTitle);
    await linkRow.getByRole("button", { name: /save/i }).click();

    await Promise.race([
      expect(page.getByText(/link updated/i)).toBeVisible({ timeout: 5000 }),
      expect(titleInput).not.toBeVisible({ timeout: 5000 }),
    ]).catch(() => {});

    await page.waitForLoadState("networkidle");
    await expect(page.getByText(editedTitle)).toBeVisible({ timeout: 10000 });
  });

  test("can delete a vendor link", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `E2E-Delete-${uniqueId}`;

    // Create a link to delete
    await page.getByRole("button", { name: /add link/i }).click();
    await page.getByLabel(/title \*/i).fill(title);
    await page.getByLabel(/url \*/i).fill("https://delete-me.example.com");
    await page
      .getByRole("button", { name: /^add link$/i })
      .last()
      .click();

    await Promise.race([
      expect(page.getByText(/link added/i)).toBeVisible({ timeout: 5000 }),
      expect(page.getByText(/new vendor link/i)).not.toBeVisible({
        timeout: 5000,
      }),
    ]).catch(() => {});
    await page.waitForLoadState("networkidle");

    // Find the row and click delete
    const linkRow = page
      .locator(".border.rounded-lg")
      .filter({ hasText: title });
    await expect(linkRow).toBeVisible({ timeout: 10000 });

    // Last button in the actions group is the delete (trash) button
    const deleteButton = linkRow.getByRole("button").last();
    await deleteButton.click();

    // Wait for success toast
    await expect(page.getByText(/link deleted/i)).toBeVisible({
      timeout: 10000,
    });

    // Verify the link is gone
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
  });

  test("category filter shows only links in that category", async ({
    page,
  }) => {
    const uniqueId = Date.now();
    const venueTitle = `E2E-Venue-${uniqueId}`;

    // Add a venue link
    await page.getByRole("button", { name: /add link/i }).click();
    await page.getByLabel(/title \*/i).fill(venueTitle);
    await page.getByLabel(/url \*/i).fill("https://venue.example.com");
    // Category defaults to "other" — select "venue" via the select trigger
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /venue/i }).click();
    await page
      .getByRole("button", { name: /^add link$/i })
      .last()
      .click();

    await Promise.race([
      expect(page.getByText(/link added/i)).toBeVisible({ timeout: 5000 }),
      expect(page.getByText(/new vendor link/i)).not.toBeVisible({
        timeout: 5000,
      }),
    ]).catch(() => {});
    await page.waitForLoadState("networkidle");

    // Click "Venue" filter
    await page.getByRole("button", { name: "Venue", exact: true }).click();

    // Our venue link should be visible
    await expect(page.getByText(venueTitle)).toBeVisible();

    // Click "Other" filter — venue link should disappear (unless we also have "other" links)
    await page.getByRole("button", { name: "Other", exact: true }).click();
    await expect(page.getByText(venueTitle)).not.toBeVisible();

    // Clean up: click "All" then delete
    await page.getByRole("button", { name: "All", exact: true }).click();
    const linkRow = page
      .locator(".border.rounded-lg")
      .filter({ hasText: venueTitle });
    await expect(linkRow).toBeVisible({ timeout: 5000 });
    await linkRow.getByRole("button").last().click();
    await expect(page.getByText(/link deleted/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
