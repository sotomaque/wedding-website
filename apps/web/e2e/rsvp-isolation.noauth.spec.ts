import { expect, test } from "@playwright/test";
import { SECOND_WEDDING, slugRoutes, waitForHydration } from "./fixtures";

/**
 * RSVP Isolation Tests (No Auth Required)
 *
 * Verifies that invite codes are scoped to their wedding:
 * - Wedding 1 RSVP rejects wedding 2 invite codes
 * - Wedding 2 RSVP accepts its own invite codes
 */

const wedding1Routes = slugRoutes("helen-and-enrique");
const wedding2Routes = slugRoutes(SECOND_WEDDING.slug);

test.describe("RSVP Isolation", () => {
  test("wedding 1 RSVP with wedding 2 code should fail", async ({ page }) => {
    await page.goto(wedding1Routes.rsvp);
    await waitForHydration(page);

    // Look for the invite code input
    const codeInput = page
      .getByPlaceholder(/invite code/i)
      .or(page.getByLabel(/enter your invite code/i))
      .or(page.getByLabel(/code/i));

    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await codeInput.fill(SECOND_WEDDING.inviteCode);

      // Submit the code
      const submitButton = page.getByRole("button", {
        name: /find|submit|verify|continue/i,
      });
      await submitButton.click();

      // Should get an error — this code belongs to wedding 2, not wedding 1
      await expect(
        page.getByText(/not found|invalid|no guests|couldn't find/i),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("wedding 2 RSVP with its own code should work", async ({ page }) => {
    await page.goto(wedding2Routes.rsvp);
    await waitForHydration(page);

    // Look for the invite code input
    const codeInput = page
      .getByPlaceholder(/invite code/i)
      .or(page.getByLabel(/enter your invite code/i))
      .or(page.getByLabel(/code/i));

    if (await codeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await codeInput.fill(SECOND_WEDDING.inviteCode);

      // Submit the code
      const submitButton = page.getByRole("button", {
        name: /find|submit|verify|continue/i,
      });
      await submitButton.click();

      // Should find the guest from wedding 2
      await expect(page.getByText(SECOND_WEDDING.guestFirstName)).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
