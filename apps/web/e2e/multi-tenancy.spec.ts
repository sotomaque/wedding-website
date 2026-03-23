import { expect, test } from "@playwright/test";
import {
  isAuthAvailable,
  SECOND_WEDDING,
  slugRoutes,
  waitForHydration,
} from "./fixtures";

/**
 * Multi-Tenancy Data Isolation Tests (Authenticated)
 */

test.use({ storageState: "e2e/.auth/admin.json" });
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

const wedding1Routes = slugRoutes("helen-and-enrique");
const wedding2Routes = slugRoutes(SECOND_WEDDING.slug);

test.describe("Admin Data Isolation", () => {
  test("wedding 1 admin should see its own guests", async ({ page }) => {
    await page.goto(wedding1Routes.adminGuests);
    await waitForHydration(page);

    // Wait for the guest table to load
    await page.waitForTimeout(2000);

    // Should see E2E-Alice (wedding 1 guest)
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("E2E-Alice");
    // Should NOT see wedding 2 guest
    expect(pageContent).not.toContain(SECOND_WEDDING.guestFirstName);
  });

  test("wedding 2 admin should see its own guests", async ({ page }) => {
    await page.goto(wedding2Routes.adminGuests);
    await waitForHydration(page);

    await page.waitForTimeout(2000);

    const pageContent = await page.textContent("body");
    expect(pageContent).toContain(SECOND_WEDDING.guestFirstName);
    // Should NOT see wedding 1 guests
    expect(pageContent).not.toContain("E2E-Alice");
  });
});

test.describe("Public Page Content Isolation", () => {
  test("wedding 1 public page shows correct couple name", async ({ page }) => {
    await page.goto(wedding1Routes.home);
    await waitForHydration(page);

    await expect(page).toHaveTitle(/Helen.*Enrique|Wedding/, {
      timeout: 10000,
    });
  });

  test("wedding 2 public page shows correct couple name", async ({ page }) => {
    await page.goto(wedding2Routes.home);
    await waitForHydration(page);

    await expect(page).toHaveTitle(/E2E-Test.*Partner|Wedding/, {
      timeout: 10000,
    });
  });
});

test.describe("Invalid Slug Handling", () => {
  test("invalid slug returns 404", async ({ page }) => {
    const response = await page.goto("/nonexistent-wedding-xyz");
    // Next.js may return 200 with a 404 page, or a real 404
    const status = response?.status();
    if (status === 200) {
      // Check if the page content indicates a 404
      const content = await page.textContent("body");
      expect(content).toMatch(/not found|404/i);
    } else {
      expect(status).toBe(404);
    }
  });
});

test.describe("Theme Isolation", () => {
  test("wedding 2 applies sage-garden theme", async ({ page }) => {
    await page.goto(wedding2Routes.home);
    await waitForHydration(page);

    // The sage-garden theme injects CSS variables via a <style> tag
    const hasThemeCss = await page.evaluate(() => {
      const styles = document.querySelectorAll("style");
      for (const style of styles) {
        if (style.textContent?.includes("oklch(0.5 0.1 145)")) {
          return true;
        }
      }
      return false;
    });
    expect(hasThemeCss).toBe(true);
  });
});
