import { expect, test } from "@playwright/test";
import { SECOND_WEDDING, slugRoutes, waitForHydration } from "./fixtures";

/**
 * RSVP Isolation Tests (No Auth Required)
 *
 * Verifies that invite codes are scoped to their wedding.
 */

const wedding1Routes = slugRoutes("helen-and-enrique");
const wedding2Routes = slugRoutes(SECOND_WEDDING.slug);

test.describe("RSVP Isolation", () => {
  test("wedding 1 RSVP with wedding 2 code should fail", async ({ page }) => {
    await page.goto(wedding1Routes.rsvp);
    await waitForHydration(page);

    // The code entry has label "Enter your invite code" and placeholder "XXXX-XXXX"
    const codeInput = page.getByLabel(/enter your invite code/i);
    await expect(codeInput).toBeVisible({ timeout: 10000 });

    await codeInput.fill(SECOND_WEDDING.inviteCode);

    // Button says "Continue"
    await page.getByRole("button", { name: /continue/i }).click();

    // Should get a toast error — this code belongs to wedding 2, not wedding 1
    // The error appears as a sonner toast with description text
    await expect(page.getByText(/not valid|invalid|not found/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("wedding 2 RSVP with its own code should work", async ({ page }) => {
    await page.goto(wedding2Routes.rsvp);
    await waitForHydration(page);

    const codeInput = page.getByLabel(/enter your invite code/i);
    await expect(codeInput).toBeVisible({ timeout: 10000 });

    await codeInput.fill(SECOND_WEDDING.inviteCode);

    await page.getByRole("button", { name: /continue/i }).click();

    // Should navigate to the optional login step or RSVP form
    // The URL should contain the code parameter or show the guest name
    await page.waitForTimeout(2000);
    const pageContent = await page.textContent("body");
    // Either the guest name is visible, or we're on a login/form page (not an error)
    const hasGuestName = pageContent?.includes(SECOND_WEDDING.guestFirstName);
    const hasNoError = !pageContent?.match(/not valid|invalid code/i);
    expect(hasGuestName || hasNoError).toBeTruthy();
  });
});
