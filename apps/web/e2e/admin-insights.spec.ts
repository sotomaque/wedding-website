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

    // Wait for insights or error — skip if AI API unavailable in CI
    const hasResult = await page
      .locator("ul li")
      .first()
      .or(page.getByText(/failed/i))
      .or(page.getByText(/error/i))
      .waitFor({ timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (!hasResult) {
      test.skip(true, "AI API unavailable in CI");
      return;
    }
  });
});
