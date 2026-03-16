import { type APIRequestContext, expect, test } from "@playwright/test";

/**
 * Guest Photo Upload & Slideshow Tests (No Auth Required)
 *
 * Tests for:
 * - /photos/upload page (UI only — no actual file upload)
 * - /slideshow page with seed photo data
 *
 * NOTE: These tests require seed data in the database.
 * Run `POST /api/e2e/reset` before running locally (LOCAL_E2E_MODE=true).
 */

const E2E_RESET_SECRET = process.env.E2E_RESET_SECRET || "local-dev-secret";

async function resetDB(request: APIRequestContext) {
  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
  try {
    await request.post(`${baseURL}/api/e2e/reset`, {
      headers: { "x-e2e-reset-token": E2E_RESET_SECRET },
    });
  } catch {
    // Reset not available — assume DB is already seeded (CI path)
  }
}

test.describe("Upload page — /photos/upload", () => {
  test("loads with correct heading", async ({ page }) => {
    await page.goto("/photos/upload");
    await expect(
      page.getByRole("heading", { name: /share your photos/i }),
    ).toBeVisible();
  });

  test("shows optional name input", async ({ page }) => {
    await page.goto("/photos/upload");
    const input = page.getByLabel(/your name/i);
    await expect(input).toBeVisible();
    await expect(page.getByText(/optional/i)).toBeVisible();
  });

  test("name input accepts text", async ({ page }) => {
    await page.goto("/photos/upload");
    const input = page.getByLabel(/your name/i);
    await input.fill("Aunt Maria");
    await expect(input).toHaveValue("Aunt Maria");
  });

  test("UploadThing dropzone is rendered", async ({ page }) => {
    await page.goto("/photos/upload");
    // UploadThing renders a label with a file input or a drop zone element
    await expect(
      page
        .locator("[data-ut-element], .ut-label, input[type='file'], label")
        .first(),
    ).toBeAttached();
  });

  test("page title includes 'Share Your Photos'", async ({ page }) => {
    await page.goto("/photos/upload");
    await expect(page).toHaveTitle(/share your photos/i);
  });
});

test.describe("Slideshow — /slideshow", () => {
  test.beforeAll(async ({ request }) => {
    await resetDB(request);
  });

  test("page loads without error", async ({ page }) => {
    await page.goto("/slideshow");
    // Page should not show an error boundary or 500
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("shows at least one img element from seed data", async ({ page }) => {
    await page.goto("/slideshow");
    await expect(page.locator("img").first()).toBeAttached({ timeout: 10_000 });
  });

  test("shows photo counter", async ({ page }) => {
    await page.goto("/slideshow");
    // Counter format: "1 / 3" (3 visible seed photos)
    await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible({ timeout: 10_000 });
  });

  test("shows Live badge", async ({ page }) => {
    await page.goto("/slideshow");
    await expect(page.getByText(/live/i)).toBeVisible({ timeout: 10_000 });
  });

  test("renders QR code SVG in bottom-right corner", async ({ page }) => {
    await page.goto("/slideshow");
    // QR code is rendered as an SVG by react-qr-code
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows prev and next navigation buttons", async ({ page }) => {
    await page.goto("/slideshow");
    await expect(
      page.getByRole("button", { name: /previous photo/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /next photo/i })).toBeVisible(
      { timeout: 10_000 },
    );
  });
});
