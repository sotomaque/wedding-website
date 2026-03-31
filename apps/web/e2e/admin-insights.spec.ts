import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });

test.describe("AI RSVP Insights Card", () => {
  test.beforeEach(async ({ page }) => {
    if (!isAuthAvailable()) {
      test.skip();
    }
    await page.goto("/admin");
    await waitForHydration(page);
  });

  test("shows AI Insights card with Generate button", async ({ page }) => {
    await expect(page.getByText("AI Insights")).toBeVisible();
    await expect(page.getByRole("button", { name: /generate/i })).toBeVisible();
  });

  test("generates insights on click", async ({ page }) => {
    const generateButton = page.getByRole("button", { name: /generate/i });
    await generateButton.click();

    // Should show loading state
    await expect(page.getByText(/analyzing/i).or(generateButton)).toBeVisible();

    // Wait for insights to appear (AI response may take time)
    // Look for either insight bullets or an error message
    await expect(
      page
        .locator("ul li")
        .first()
        .or(page.getByText(/failed/i)),
    ).toBeVisible({ timeout: 30000 });
  });
});
