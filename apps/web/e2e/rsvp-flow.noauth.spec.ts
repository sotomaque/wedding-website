import { expect, test } from "@playwright/test";
import { getTestData, TEST_DATA, waitForHydration } from "./fixtures";

/**
 * RSVP User Flow Tests (No Auth Required)
 *
 * Tests for:
 * - Email deeplink flow (arriving with ?code=XXX)
 * - Manual code entry flow
 * - Skip sign-in flow
 *
 * NOTE: These tests use the invite code created during setup.
 * The setup creates a test guest and saves their invite code.
 */

function getInviteCode(): string {
  const testData = getTestData();
  return testData.inviteCode || "TEST-1234";
}

test.describe("RSVP - Code Entry Page", () => {
  test("RSVP page loads without code and shows code entry", async ({
    page,
  }) => {
    await page.goto(TEST_DATA.routes.rsvp);
    await waitForHydration(page);

    // Should show the code entry form
    await expect(page.getByLabel(/enter your invite code/i)).toBeVisible();

    // Should have Continue button
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("shows error for invalid code format", async ({ page }) => {
    await page.goto(TEST_DATA.routes.rsvp);
    await waitForHydration(page);

    // Enter a short code (less than 8 chars)
    await page.getByLabel(/enter your invite code/i).fill("ABC");

    // Continue button should be disabled for codes less than 8 characters
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeDisabled();

    // Enter a valid length but invalid format code (8+ chars)
    await page.getByLabel(/enter your invite code/i).fill("INVALID1");

    // Now continue button should be enabled
    await expect(continueButton).toBeEnabled({ timeout: 2000 });
    await continueButton.click();

    // Should show error toast (use first() since there may be title and description)
    await expect(page.getByText(/invalid code|not valid/i).first()).toBeVisible(
      {
        timeout: 10000,
      },
    );
  });

  test("shows error for non-existent invite code", async ({ page }) => {
    await page.goto(TEST_DATA.routes.rsvp);
    await waitForHydration(page);

    // Enter a valid format but non-existent code
    await page.getByLabel(/enter your invite code/i).fill("FAKE-1234");

    // Click continue
    await page.getByRole("button", { name: /continue/i }).click();

    // Should show error
    await expect(page.getByText(/invalid code|not valid/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("RSVP - Deeplink Flow", () => {
  test("deeplink with valid code shows optional login step", async ({
    page,
  }) => {
    const inviteCode = getInviteCode();
    // Skip test if no valid test code is set
    if (inviteCode === "TEST-1234") {
      test.skip();
      return;
    }

    await page.goto(`${TEST_DATA.routes.rsvp}?code=${inviteCode}`);
    await waitForHydration(page);

    // Should show optional login step
    await expect(
      page.getByRole("heading", { name: /sign in.*optional/i }),
    ).toBeVisible({ timeout: 10000 });

    // Should have Google sign in button
    await expect(
      page.getByRole("button", { name: /sign in with google/i }),
    ).toBeVisible();

    // Should have skip button
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible();
  });

  test("deeplink with invalid code shows error", async ({ page }) => {
    await page.goto(`${TEST_DATA.routes.rsvp}?code=INVALID-CODE`);
    await waitForHydration(page);

    // Should show error toast (use first() since there may be title and description)
    await expect(page.getByText(/invalid code|not valid/i).first()).toBeVisible(
      {
        timeout: 5000,
      },
    );

    // Should show code entry form
    await expect(page.getByLabel(/enter your invite code/i)).toBeVisible();
  });
});

test.describe("RSVP - Skip Sign-In Flow", () => {
  test("can skip sign-in and proceed to RSVP form", async ({ page }) => {
    const inviteCode = getInviteCode();
    // Skip test if no valid test code is set
    if (inviteCode === "TEST-1234") {
      test.skip();
      return;
    }

    await page.goto(`${TEST_DATA.routes.rsvp}?code=${inviteCode}`);
    await waitForHydration(page);

    // Wait for optional login step
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible({ timeout: 10000 });

    // Click skip
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Should navigate to the form step
    await page.waitForURL(/step=form/, { timeout: 10000 });

    // Should show the RSVP form with guest details
    await expect(
      page
        .getByRole("radio")
        .or(page.getByRole("button", { name: /submit|rsvp/i })),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("RSVP - Manual Entry Flow", () => {
  test("can manually enter code and proceed", async ({ page }) => {
    const inviteCode = getInviteCode();
    // Skip test if no valid test code is set
    if (inviteCode === "TEST-1234") {
      test.skip();
      return;
    }

    await page.goto(TEST_DATA.routes.rsvp);
    await waitForHydration(page);

    // Enter the code
    await page.getByLabel(/enter your invite code/i).fill(inviteCode);

    // Click continue
    await page.getByRole("button", { name: /continue/i }).click();

    // Should navigate to optional login step
    await expect(
      page.getByRole("heading", { name: /sign in.*optional/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("code entry is case-insensitive", async ({ page }) => {
    const inviteCode = getInviteCode();
    // Skip test if no valid test code is set
    if (inviteCode === "TEST-1234") {
      test.skip();
      return;
    }

    await page.goto(TEST_DATA.routes.rsvp);
    await waitForHydration(page);

    // Enter the code in lowercase (it should auto-uppercase or accept it)
    const lowercaseCode = inviteCode.toLowerCase();
    await page.getByLabel(/enter your invite code/i).fill(lowercaseCode);

    // Click continue
    await page.getByRole("button", { name: /continue/i }).click();

    // Should navigate to optional login step (success)
    await expect(
      page.getByRole("heading", { name: /sign in.*optional/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("RSVP - Form Submission", () => {
  test("can submit RSVP form with attending = yes", async ({ page }) => {
    const inviteCode = getInviteCode();
    // Skip test if no valid test code is set
    if (inviteCode === "TEST-1234") {
      test.skip();
      return;
    }

    // Go directly to the form step
    await page.goto(`${TEST_DATA.routes.rsvp}?code=${inviteCode}&step=form`);
    await waitForHydration(page);

    // Click the "Joyfully Accept" button to select attending = yes
    const acceptButton = page.getByRole("button", { name: /joyfully accept/i });
    await expect(acceptButton).toBeVisible({ timeout: 10000 });
    await acceptButton.click();

    // Now click the Submit button to submit the form
    const submitButton = page.getByRole("button", {
      name: /submit rsvp|update rsvp/i,
    });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Should show success message or redirect to things-to-do
    // Use first() since toast has both title and description
    await expect(page.getByText(/rsvp submitted|rsvp updated/i).first())
      .toBeVisible({ timeout: 15000 })
      .catch(async () => {
        // Alternatively, check if redirected to things-to-do
        await expect(page).toHaveURL(/things-to-do/, { timeout: 5000 });
      });
  });

  test("can submit RSVP form with attending = no", async ({ page }) => {
    const inviteCode = getInviteCode();
    // Skip test if no valid test code is set
    if (inviteCode === "TEST-1234") {
      test.skip();
      return;
    }

    await page.goto(`${TEST_DATA.routes.rsvp}?code=${inviteCode}&step=form`);
    await waitForHydration(page);

    // Click the "Regretfully Decline" button to select attending = no
    const declineButton = page.getByRole("button", {
      name: /regretfully decline/i,
    });
    await expect(declineButton).toBeVisible({ timeout: 10000 });
    await declineButton.click();

    // Now click the Submit button (may be "Update RSVP" if already submitted)
    const submitButton = page.getByRole("button", {
      name: /submit rsvp|update rsvp/i,
    });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Should show success message (won't redirect to things-to-do for "no")
    // Use first() since toast has both title and description
    await expect(
      page.getByText(/rsvp submitted|rsvp updated|we'll miss you/i).first(),
    ).toBeVisible({
      timeout: 15000,
    });
  });
});
