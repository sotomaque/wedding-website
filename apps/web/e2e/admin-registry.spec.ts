import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.describe("Registry Item Management", () => {
  test.beforeEach(async ({ page }) => {
    if (!isAuthAvailable()) {
      test.skip();
    }
    await page.goto("/admin");
    await waitForHydration(page);
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

    await expect(
      page.getByRole("heading", { name: /add registry item/i }),
    ).toBeVisible();

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("A test registry item");
    await page.getByLabel("Emoji").fill("🎁");

    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("🎁")).toBeVisible();
  });

  test("can edit a registry item", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `Edit-Test ${uniqueId}`;

    // Create an item
    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 5000,
    });

    // Find the card by heading and click the pencil (edit) button
    // The edit button is in the actions row — it's the button right after the switch
    const card = page.locator(".border.rounded-lg").filter({
      has: page.getByRole("heading", { name: title }),
    });
    // The pencil button is the second-to-last button in the card
    const editButton = card.getByRole("switch").locator("~ button").first();
    await editButton.click();

    await expect(
      page.getByRole("heading", { name: /edit registry item/i }),
    ).toBeVisible();

    const titleInput = page.getByLabel("Title");
    await titleInput.clear();
    await titleInput.fill(`${title} Updated`);
    await page.getByRole("button", { name: /^update$/i }).click();

    await expect(
      page.getByRole("heading", { name: `${title} Updated` }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("can toggle item active/inactive", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `Toggle-Test ${uniqueId}`;

    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 5000,
    });

    // Find the specific card — use the heading's closest card ancestor
    const heading = page.getByRole("heading", { name: title });
    const card = heading
      .locator("ancestor::div[contains(@class,'rounded-lg')]")
      .first();

    // Fallback: find by filtering direct children of the grid
    // The switch is inside the card that contains this specific heading
    const gridCards = page.locator(".grid > .border.rounded-lg");
    const cardCount = await gridCards.count();
    let targetSwitch = page.getByRole("switch").first(); // fallback

    for (let i = 0; i < cardCount; i++) {
      const c = gridCards.nth(i);
      if (await c.getByRole("heading", { name: title }).isVisible()) {
        targetSwitch = c.getByRole("switch");
        break;
      }
    }

    await targetSwitch.click();

    // Verify the badge changed — find the card again and check
    await page.waitForTimeout(500);
    const badgeVisible = await page
      .locator(".grid > .border.rounded-lg")
      .filter({ hasText: title })
      .getByText("Hidden")
      .first()
      .isVisible()
      .catch(() => false);
    expect(badgeVisible).toBe(true);
  });

  test("can delete a registry item", async ({ page }) => {
    const uniqueId = Date.now();
    const title = `Delete-Test ${uniqueId}`;

    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 5000,
    });

    // Accept the window.confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Find the card and click the last button (trash/delete icon)
    const card = page.locator(".border.rounded-lg").filter({
      has: page.getByRole("heading", { name: title }),
    });
    // The delete button is the last button in the card
    await card.getByRole("button").last().click();

    // Item should be gone
    await expect(page.getByRole("heading", { name: title })).not.toBeVisible({
      timeout: 5000,
    });
  });
});
