import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.describe("Registry Item Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!isAuthAvailable()) {
      test.skip();
    }
    // Navigate to registry via admin page (slug resolved from URL)
    await page.goto("/admin");
    await waitForHydration(page);
    // Get the registry URL from the current slug
    const url = page.url();
    const slug = new URL(url).pathname.split("/")[1];
    await page.goto(`/${slug}/admin/registry`);
    await waitForHydration(page);
  });

  test("shows registry page with Add Item button", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /registry items/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /add item/i })).toBeVisible();
  });

  test("can create a new registry item", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `Test Fund ${uniqueId}`;

    await page.getByRole("button", { name: /add item/i }).click();

    // Dialog should open
    await expect(
      page.getByRole("heading", { name: /add registry item/i }),
    ).toBeVisible();

    // Fill form
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("A test registry item");
    await page.getByLabel("Emoji").fill("🎁");

    // Submit
    await page.getByRole("button", { name: /^create$/i }).click();

    // Should show success and item appears
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("🎁")).toBeVisible();
  });

  test("can edit a registry item", async ({ page }) => {
    // Create an item first
    const uniqueId = Date.now();
    const title = `Edit-Test ${uniqueId}`;

    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });

    // Click edit on the item
    const card = page.locator(".border.rounded-lg").filter({ hasText: title });
    await card.getByRole("button", { name: /edit/i }).click();

    // Dialog should open with "Edit"
    await expect(
      page.getByRole("heading", { name: /edit registry item/i }),
    ).toBeVisible();

    // Change title
    const titleInput = page.getByLabel("Title");
    await titleInput.clear();
    await titleInput.fill(`${title} Updated`);
    await page.getByRole("button", { name: /^update$/i }).click();

    // Updated title should appear
    await expect(page.getByText(`${title} Updated`)).toBeVisible({
      timeout: 5000,
    });
  });

  test("can toggle item active/inactive", async ({ page }) => {
    // Create an item
    const uniqueId = Date.now();
    const title = `Toggle-Test ${uniqueId}`;

    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });

    // Find the card and its active toggle
    const card = page.locator(".border.rounded-lg").filter({ hasText: title });
    await expect(card.getByText("Active")).toBeVisible();

    // Toggle off
    await card.getByRole("switch").click();

    // Should show "Hidden"
    await expect(card.getByText("Hidden")).toBeVisible({ timeout: 3000 });
  });

  test("can delete a registry item", async ({ page }) => {
    // Create an item to delete
    const uniqueId = Date.now();
    const title = `Delete-Test ${uniqueId}`;

    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });

    // Accept the confirmation dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Click delete
    const card = page.locator(".border.rounded-lg").filter({ hasText: title });
    await card
      .getByRole("button")
      .filter({ has: page.locator(".text-destructive") })
      .click();

    // Item should be gone
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
  });
});
