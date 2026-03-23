import { expect, test } from "@playwright/test";
import { isAuthAvailable } from "./fixtures";

/**
 * Admin Guest Photo Moderation Tests
 *
 * Tests for /admin/photos/guest:
 * - Page load and auth guard
 * - QR code section
 * - Filter tabs with counts
 * - Photo grid rendering
 * - Toggle visibility (hide/show) — mutates state, requires serial mode
 * - Delete photo — mutates state, requires serial mode
 * - Download All button loading state
 *
 * NOTE: Requires admin authentication and seed data.
 * Seed data: 4 photos total — 3 visible, 1 pre-hidden.
 */

test.use({ storageState: "e2e/.auth/admin.json" });
test.describe.configure({ mode: "serial" });

const E2E_RESET_SECRET = process.env.E2E_RESET_SECRET || "local-dev-secret";

test.beforeAll(async ({ request }) => {
  if (!isAuthAvailable()) return;

  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
  try {
    await request.post(`${baseURL}/api/e2e/reset`, {
      headers: { "x-e2e-reset-token": E2E_RESET_SECRET },
    });
  } catch {
    // Reset not available — assume DB is already seeded (CI path)
  }
});

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

// ----- Page load -----

test("admin can access /admin/photos/guest", async ({ page }) => {
  await page.goto("/admin/photos/guest");
  await expect(
    page.getByRole("heading", { name: /guest photos/i }),
  ).toBeVisible();
});

// ----- QR code section -----

test.describe("QR code section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/photos/guest");
  });

  test("renders QR code SVG", async ({ page }) => {
    await expect(page.locator("svg").first()).toBeVisible();
  });

  test("shows 'Guest Upload QR Code' heading", async ({ page }) => {
    await expect(page.getByText("Guest Upload QR Code")).toBeVisible();
  });

  test("upload URL contains /photos/upload", async ({ page }) => {
    await expect(page.getByText(/\/photos\/upload/)).toBeVisible();
  });

  test("shows 'View slideshow →' link", async ({ page }) => {
    await expect(page.getByText(/view slideshow/i)).toBeVisible();
  });
});

// ----- Filter tabs -----

test.describe("Filter tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/photos/guest");
  });

  test("shows All, Visible, and Hidden tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^all/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^visible/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^hidden/i })).toBeVisible();
  });

  test("All tab shows count of 4", async ({ page }) => {
    // Scope to the filter tab group to avoid matching "↓ Download All (4)"
    const tabGroup = page.locator(
      ".flex.gap-1.border.border-border.rounded-lg",
    );
    await expect(tabGroup.getByRole("button", { name: /^all/i })).toContainText(
      "(4)",
    );
  });

  test("Visible tab shows count of 3", async ({ page }) => {
    const tabGroup = page.locator(
      ".flex.gap-1.border.border-border.rounded-lg",
    );
    await expect(
      tabGroup.getByRole("button", { name: /^visible/i }),
    ).toContainText("(3)");
  });

  test("Hidden tab shows count of 1", async ({ page }) => {
    const tabGroup = page.locator(
      ".flex.gap-1.border.border-border.rounded-lg",
    );
    await expect(
      tabGroup.getByRole("button", { name: /^hidden/i }),
    ).toContainText("(1)");
  });

  test("clicking Hidden tab shows only the pre-hidden photo", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /^hidden/i }).click();
    // Only E2E-Hidden should be visible; others should be gone
    await expect(page.getByAltText("Photo by E2E-Hidden")).toBeAttached();
    await expect(page.getByAltText("Photo by E2E-Guest")).not.toBeAttached();
  });

  test("clicking Visible tab hides the pre-hidden photo", async ({ page }) => {
    await page.getByRole("button", { name: /^visible/i }).click();
    await expect(page.getByAltText("Photo by E2E-Hidden")).not.toBeAttached();
    await expect(page.getByAltText("Photo by E2E-Guest")).toBeAttached();
  });
});

// ----- Photo grid -----

test.describe("Photo grid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/photos/guest");
  });

  test("shows at least one photo card", async ({ page }) => {
    await expect(page.locator("img[alt]").first()).toBeAttached();
  });

  test("pre-hidden photo has 'Hidden' badge", async ({ page }) => {
    // Find the card containing the E2E-Hidden photo
    const card = page
      .locator(".group")
      .filter({ has: page.getByAltText("Photo by E2E-Hidden") });
    await expect(card.getByText("Hidden", { exact: true })).toBeVisible();
  });

  test("pre-hidden photo card has reduced opacity class", async ({ page }) => {
    const card = page
      .locator(".group")
      .filter({ has: page.getByAltText("Photo by E2E-Hidden") });
    await expect(card).toHaveClass(/opacity-50/);
  });
});

// ----- Toggle visibility (serial — mutates state) -----

test("hide a visible photo: card gets opacity-50 and Hidden badge", async ({
  page,
}) => {
  await page.goto("/admin/photos/guest");

  const card = page
    .locator(".group")
    .filter({ has: page.getByAltText("Photo by E2E-Guest") });

  // Card should start visible (no opacity-50)
  await expect(card).not.toHaveClass(/opacity-50/);

  // Hover to reveal overlay, then click Hide
  await card.hover();
  await card.getByRole("button", { name: "Hide" }).click();

  // Wait for router.refresh() to re-render with updated data
  await page.waitForTimeout(2000);

  // Re-locate the card (DOM may have been replaced by router.refresh)
  const updatedCard = page
    .locator(".group")
    .filter({ has: page.getByAltText("Photo by E2E-Guest") });

  // Card should now be hidden
  await expect(updatedCard).toHaveClass(/opacity-50/, { timeout: 10000 });
  await expect(updatedCard.getByText("Hidden", { exact: true })).toBeVisible();
});

test("show a hidden photo: card loses opacity-50 and Hidden badge", async ({
  page,
}) => {
  await page.goto("/admin/photos/guest");

  // After the previous test, E2E-Guest is now hidden — find it
  const card = page
    .locator(".group")
    .filter({ has: page.getByAltText("Photo by E2E-Guest") });

  await expect(card).toHaveClass(/opacity-50/, { timeout: 10000 });

  await card.hover();
  await card.getByRole("button", { name: "Show" }).click();

  await page.waitForTimeout(2000);

  const updatedCard = page
    .locator(".group")
    .filter({ has: page.getByAltText("Photo by E2E-Guest") });

  await expect(updatedCard).not.toHaveClass(/opacity-50/, { timeout: 10000 });
  await expect(
    updatedCard.getByText("Hidden", { exact: true }),
  ).not.toBeVisible();
});

// ----- Delete (serial — mutates state) -----

test("delete a photo: it disappears from the grid after deletion", async ({
  page,
}) => {
  await page.goto("/admin/photos/guest");

  const card = page
    .locator(".group")
    .filter({ has: page.getByAltText("Photo by E2E-Delete-Me") });

  await expect(card).toBeAttached();

  // Accept the confirm() dialog
  page.once("dialog", (d) => d.accept());

  await card.hover();
  await card.getByRole("button", { name: "Delete" }).click();

  await page.waitForLoadState("networkidle");

  // Photo should be gone from the grid
  await expect(page.getByAltText("Photo by E2E-Delete-Me")).not.toBeAttached();
});

// ----- Download All button -----

test.describe("Download All button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/photos/guest");
  });

  test("Download All button is visible and shows photo count", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /download all/i }),
    ).toBeVisible();
    // Button text includes the count, e.g. "↓ Download All (4)"
    await expect(
      page.getByRole("button", { name: /download all.*\d+/i }),
    ).toBeVisible();
  });

  test("shows loading spinner while building zip", async ({ page }) => {
    // Intercept the download route and delay the response
    await page.route("**/api/admin/guest-photos/download", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    const downloadButton = page.getByRole("button", { name: /download all/i });
    await downloadButton.click();

    // While the request is in flight, button should show loading state
    await expect(page.getByText(/building zip/i)).toBeVisible({
      timeout: 2000,
    });
    await expect(page.locator(".animate-spin")).toBeVisible({ timeout: 2000 });
  });
});
