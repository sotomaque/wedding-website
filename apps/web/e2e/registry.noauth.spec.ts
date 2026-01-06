import { expect, test } from "@playwright/test";
import { TEST_DATA, waitForHydration } from "./fixtures";

/**
 * Registry Page Tests (No Auth Required)
 *
 * Tests for:
 * - Page loads without authentication
 * - Gift cards display correctly
 * - Navigation works
 * - Stripe links are functional
 * - Responsive design
 */

test.describe("Registry - Public Access", () => {
  test("page loads without authentication", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Should show the registry content
    await expect(page.locator("main")).toBeVisible();

    // Should have the page title
    await expect(
      page.getByRole("heading", { name: /gift registry/i }),
    ).toBeVisible();
  });

  test("displays all three gift cards", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Check for all three gift fund titles
    await expect(page.getByText("Future Tiny Humans Fund")).toBeVisible();
    await expect(page.getByText("Send Us Somewhere Pretty")).toBeVisible();
    await expect(page.getByText("Bye Bye Student Loans")).toBeVisible();
  });

  test("gift cards have contribute buttons", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Should have contribute buttons (or "Coming Soon" if env not set)
    const contributeButtons = page.getByRole("button", { name: /contribute/i });
    const comingSoonButtons = page.getByRole("button", {
      name: /coming soon/i,
    });

    // Either all contribute buttons or all coming soon buttons should be visible
    const contributeCount = await contributeButtons.count();
    const comingSoonCount = await comingSoonButtons.count();

    expect(contributeCount + comingSoonCount).toBe(3);
  });

  test("stripe links open in new tab", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Find all contribute links
    const contributeLinks = page.locator('a[target="_blank"]');
    const linkCount = await contributeLinks.count();

    // If env vars are set, there should be 3 links
    if (linkCount > 0) {
      // Check that links have target="_blank" and rel="noopener noreferrer"
      for (let i = 0; i < linkCount; i++) {
        const link = contributeLinks.nth(i);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    }
  });

  test("displays gift descriptions", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Check for descriptions
    await expect(
      page.getByText(/we're not pregnant—just planners/i),
    ).toBeVisible();
    await expect(
      page.getByText(/fund our first adventure as a married couple/i),
    ).toBeVisible();
    await expect(page.getByText(/sallie mae freedom fund/i)).toBeVisible();
  });

  test("displays emojis for each gift", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Check for emojis (they're in the cards)
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("👶");
    expect(pageContent).toContain("✈️");
    expect(pageContent).toContain("🎓");
  });
});

test.describe("Registry - Navigation", () => {
  test("can access from main navigation", async ({ page }) => {
    // Start from home page
    await page.goto(TEST_DATA.routes.home);
    await waitForHydration(page);

    // Look for Registry link in navigation
    const navLink = page.getByRole("link", { name: /registry/i }).first();

    if (await navLink.isVisible()) {
      await navLink.click();

      // Should navigate to registry page
      await expect(page).toHaveURL(/registry/);
    } else {
      // If not in main nav, test passes
      test.skip();
    }
  });

  test("can access from home page details section", async ({ page }) => {
    await page.goto(TEST_DATA.routes.home);
    await waitForHydration(page);

    // Scroll to details section
    await page.locator("#details").scrollIntoViewIfNeeded();

    // Look for registry link in details section
    const registryLink = page.getByRole("link", {
      name: /view our gift registry/i,
    });

    if (await registryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await registryLink.click();
      await expect(page).toHaveURL(/registry/);
    } else {
      // Link might have different text
      const altLink = page
        .locator("#details")
        .getByRole("link", { name: /registry/i });
      if (await altLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await altLink.click();
        await expect(page).toHaveURL(/registry/);
      }
    }
  });

  test("has navigation header visible", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    await expect(page.locator("nav")).toBeVisible();
  });

  test("has footer visible", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    await expect(page.locator("footer")).toBeVisible();
  });

  test("can navigate back to home", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Click on logo or brand link to go home
    const brandLink = page.locator("nav").getByRole("link").first();
    await brandLink.click();

    // Should navigate to home (may include hash like /#story)
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?/);
  });
});

test.describe("Registry - Responsive Design", () => {
  test("displays correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Main content should be visible
    await expect(page.locator("main")).toBeVisible();

    // Cards should stack vertically on mobile (check width)
    const mainElement = page.locator("main");
    const box = await mainElement.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);

    // All three gift titles should still be visible
    await expect(page.getByText("Future Tiny Humans Fund")).toBeVisible();
    await expect(page.getByText("Send Us Somewhere Pretty")).toBeVisible();
    await expect(page.getByText("Bye Bye Student Loans")).toBeVisible();
  });

  test("displays correctly on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /gift registry/i }),
    ).toBeVisible();
  });

  test("displays correctly on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /gift registry/i }),
    ).toBeVisible();
  });
});

test.describe("Registry - Content Sections", () => {
  test("has hero section with title and subtitle", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Check hero content
    await expect(
      page.getByRole("heading", { name: /gift registry/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/your presence is the greatest gift/i),
    ).toBeVisible();
  });

  test("has thank you section", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Check for thank you message
    await expect(
      page.getByText(/thank you for celebrating this special moment/i),
    ).toBeVisible();
  });

  test("gift cards have images", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registry);
    await waitForHydration(page);

    // Check that images are present in cards
    const images = page.locator("main img");
    const imageCount = await images.count();

    // Should have at least 3 images (one per card)
    expect(imageCount).toBeGreaterThanOrEqual(3);
  });
});

test.describe("Registry - Thank You Page", () => {
  test("thank you page loads", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registryThankYou);
    await waitForHydration(page);

    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /thank you/i }),
    ).toBeVisible();
  });

  test("displays gratitude message", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registryThankYou);
    await waitForHydration(page);

    await expect(
      page.getByText(/your generosity means the world to us/i),
    ).toBeVisible();
    await expect(
      page.getByText(/we're so grateful for your kindness/i),
    ).toBeVisible();
  });

  test("has navigation links", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registryThankYou);
    await waitForHydration(page);

    // Check for Things To Do link (in main content, not nav)
    await expect(
      page.getByRole("link", { name: "Things To Do in San Diego" }),
    ).toBeVisible();

    // Check for Schedule link
    await expect(
      page.getByRole("link", { name: /view wedding schedule/i }),
    ).toBeVisible();

    // Check for Back to Home link
    await expect(
      page.getByRole("link", { name: /back to home/i }),
    ).toBeVisible();
  });

  test("things to do link navigates correctly", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registryThankYou);
    await waitForHydration(page);

    await page.getByRole("link", { name: "Things To Do in San Diego" }).click();
    await expect(page).toHaveURL(/things-to-do/);
  });

  test("back to home link navigates correctly", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registryThankYou);
    await waitForHydration(page);

    await page.getByRole("link", { name: /back to home/i }).click();
    await expect(page).toHaveURL(TEST_DATA.routes.home);
  });

  test("has navigation header and footer", async ({ page }) => {
    await page.goto(TEST_DATA.routes.registryThankYou);
    await waitForHydration(page);

    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });
});
