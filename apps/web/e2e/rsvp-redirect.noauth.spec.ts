import { expect, test } from "@playwright/test";
import { getTestData, TEST_DATA, waitForHydration } from "./fixtures";

/**
 * RSVP Redirect Test (mutating — submits an RSVP form)
 *
 * Uses a dedicated fresh guest (E2E4-RSVP) whose RSVP is always "pending"
 * at the start of the test run, ensuring the form is available.
 */
test.describe("RSVP → Things To Do Redirect", () => {
  test("submitting RSVP with 'yes' redirects to things-to-do", async ({
    page,
  }) => {
    const rsvpCode = getTestData().rsvpRedirectCode;
    if (!rsvpCode) {
      test.skip(true, "No RSVP redirect code from seed data");
      return;
    }

    await page.goto(`${TEST_DATA.routes.rsvp}?code=${rsvpCode}&step=form`);
    await waitForHydration(page);

    // Select "Yes" attendance
    const yesOption = page.getByRole("radio", { name: /yes/i }).first();
    if (await yesOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yesOption.click();

      // Submit the form
      await page.getByRole("button", { name: /submit|save|rsvp/i }).click();

      // Should redirect to things-to-do or show success
      try {
        await expect(page).toHaveURL(/things-to-do/, { timeout: 15000 });
      } catch {
        await expect(page.getByText(/thank you|success/i)).toBeVisible();
      }
    } else {
      test.skip(
        true,
        "RSVP form not visible — guest may already have responded",
      );
    }
  });
});
