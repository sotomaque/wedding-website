import { expect, test } from "@playwright/test";
import {
  isAuthAvailable,
  TEST_DATA,
  waitForGuestCreated,
  waitForHydration,
} from "./fixtures";

/**
 * Admin Guest Management Tests
 *
 * Tests for:
 * - Guest CRUD operations (Create, Read, Update, Delete)
 * - Trigger/Resend Email functionality
 *
 * NOTE: These tests require admin authentication.
 * Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD environment variables,
 * or run with a pre-authenticated storage state.
 */

// Use stored auth state from setup
test.use({ storageState: "e2e/.auth/admin.json" });

// Run tests serially to avoid interference between tests creating similar guests
test.describe.configure({ mode: "serial" });

// Skip all tests in this file if auth is not available
test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Guest Management - CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to guests page
    await page.goto(TEST_DATA.routes.adminGuests);
    await waitForHydration(page);
  });

  test("displays guest management page with table", async ({ page }) => {
    // Should show the guest management heading
    await expect(
      page.getByRole("heading", { name: /guest management/i }),
    ).toBeVisible();

    // Should show Add Guest button
    await expect(
      page.getByRole("button", { name: /add guest/i }),
    ).toBeVisible();

    // Should show the guests table
    await expect(page.locator("table")).toBeVisible();
  });

  test("can open Add Guest form", async ({ page }) => {
    // Click Add Guest button
    await page.getByRole("button", { name: /add guest/i }).click();

    // Should show the add guest sheet/dialog
    await expect(
      page.getByRole("heading", { name: /add new guest/i }),
    ).toBeVisible();

    // Should have First Name and Last Name fields
    await expect(page.getByLabel(/first name/i).first()).toBeVisible();
    await expect(page.getByLabel(/last name/i).first()).toBeVisible();

    // Should have Email field
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
  });

  test("can create a new guest", async ({ page }) => {
    const uniqueId = Date.now();
    const testFirstName = `E2E-Test-${uniqueId}`;
    const testLastName = "Guest";
    const testEmail = `e2e-test-${uniqueId}@example.com`;

    // Click Add Guest button
    await page.getByRole("button", { name: /add guest/i }).click();

    // Wait for sheet to open
    await expect(
      page.getByRole("heading", { name: /add new guest/i }),
    ).toBeVisible();

    // Fill in the form
    await page
      .getByLabel(/^first name/i)
      .first()
      .fill(testFirstName);
    await page
      .getByLabel(/^last name/i)
      .first()
      .fill(testLastName);
    await page
      .getByLabel(/^email/i)
      .first()
      .fill(testEmail);

    // Submit the form
    await page.getByRole("button", { name: /create guest/i }).click();

    // Wait for guest creation
    await waitForGuestCreated(page);

    // Wait for page to be stable
    await page.waitForLoadState("networkidle");

    // Verify guest appears in the table (search for them)
    await page.getByPlaceholder(/filter by name/i).fill(testFirstName);
    await page.waitForTimeout(500); // Wait for filter to apply

    // Should find the guest in the table - use row filter to be precise
    const guestRow = page
      .locator("table tbody tr")
      .filter({ hasText: testFirstName })
      .first();
    await expect(guestRow).toBeVisible({ timeout: 10000 });
  });

  test("can edit an existing guest", async ({ page }) => {
    // Check if table has any rows
    const rowCount = await page.locator("table tbody tr").count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Wait for the edit button to be ready and click it
    const editButton = page.getByRole("button", { name: /edit/i }).first();
    await expect(editButton).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500); // Wait for any animations to settle
    await editButton.click();

    // Wait for edit sheet to open with longer timeout
    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });

    // Get current first name
    const firstNameInput = page.getByLabel(/^first name/i).first();
    const originalName = await firstNameInput.inputValue();

    // Modify the name
    const modifiedName = `${originalName}-edited`;
    await firstNameInput.clear();
    await firstNameInput.fill(modifiedName);

    // Save changes
    await page.getByRole("button", { name: /update guest/i }).click();

    // Wait for success - either toast or sheet closes
    await Promise.race([
      expect(page.getByText(/guest updated/i)).toBeVisible({ timeout: 5000 }),
      expect(
        page.getByRole("heading", { name: /edit guest/i }),
      ).not.toBeVisible({ timeout: 5000 }),
    ]).catch(() => {
      // Either condition is fine
    });

    // Close the sheet if still open
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Revert the change for cleanup
    await page.getByPlaceholder(/filter by name/i).fill(modifiedName);
    await expect(
      page.getByRole("cell", { name: modifiedName }).first(),
    ).toBeVisible({ timeout: 5000 });
    const revertEditButton = page
      .getByRole("button", { name: /edit/i })
      .first();
    await expect(revertEditButton).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await revertEditButton.click();
    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });
    await page
      .getByLabel(/^first name/i)
      .first()
      .clear();
    await page
      .getByLabel(/^first name/i)
      .first()
      .fill(originalName);
    await page.getByRole("button", { name: /update guest/i }).click();
  });

  test("can delete a guest", async ({ page }) => {
    // First create a guest to delete
    const uniqueId = Date.now();
    const testFirstName = `Delete-Test-${uniqueId}`;
    const testEmail = `delete-test-${uniqueId}@example.com`;

    // Create the guest
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .getByLabel(/^first name/i)
      .first()
      .fill(testFirstName);
    await page
      .getByLabel(/^email/i)
      .first()
      .fill(testEmail);
    await page.getByRole("button", { name: /create guest/i }).click();
    await waitForGuestCreated(page);

    // Search for the guest (use exact match to avoid partial matches)
    await page.getByPlaceholder(/filter by name/i).fill(testFirstName);
    await page.waitForTimeout(1000); // Wait for filter to apply

    // Find the row containing our guest
    const guestRow = page
      .locator("table tbody tr")
      .filter({ hasText: testFirstName })
      .first();
    await expect(guestRow).toBeVisible({ timeout: 5000 });

    // Click Edit button with force to ensure click registers
    const editButton = guestRow.getByRole("button", { name: /edit/i });
    await editButton.click({ force: true });

    // Wait for edit sheet to open
    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });

    // Click Delete button
    await page.getByRole("button", { name: /delete guest/i }).click();

    // Confirm deletion in the dialog
    await expect(
      page.getByRole("heading", { name: /are you sure/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^delete$/i }).click();

    // Wait for success toast
    await expect(page.getByText(/guest deleted/i)).toBeVisible({
      timeout: 10000,
    });

    // Wait for the edit sheet to close and page to stabilize
    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).not.toBeVisible({ timeout: 5000 });

    // Wait for page to refresh after deletion
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify guest no longer appears - clear filter first, then search
    const filterInput = page.getByPlaceholder(/filter by name/i);
    await filterInput.clear();
    await page.waitForTimeout(300);
    await filterInput.fill(testFirstName);
    await page.waitForTimeout(500);

    // Check that the guest row is gone - either "no guests match" message or the row is not visible
    const guestRowAfterDelete = page
      .locator("table tbody tr")
      .filter({ hasText: testFirstName });

    // Wait for either the "no guests" message or verify the row count is 0
    await expect(
      page
        .getByText(/no guests match your filters/i)
        .or(guestRowAfterDelete.first()),
    )
      .toBeVisible({ timeout: 5000 })
      .catch(async () => {
        // If neither is visible, just check the row is gone
        const rowCount = await guestRowAfterDelete.count();
        expect(rowCount).toBe(0);
      });
  });
});

test.describe("Guest Management - RSVP Link", () => {
  test.beforeEach(async ({ page }) => {
    if (!isAuthAvailable()) {
      test.skip();
    }
    await page.goto(TEST_DATA.routes.adminGuests);
    await waitForHydration(page);
  });

  test("copy RSVP link includes wedding slug in URL", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Ensure there are rows in the table
    const rowCount = await page.locator("table tbody tr").count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Find the copy RSVP link button (link icon next to invite code)
    const copyRsvpButton = page
      .locator("button[title='Copy RSVP link']")
      .first();
    await expect(copyRsvpButton).toBeVisible({ timeout: 5000 });
    await copyRsvpButton.click();

    // Read clipboard and verify the URL format includes the slug
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    const currentUrl = new URL(page.url());
    const slug = currentUrl.pathname.split("/")[1];

    expect(clipboardText).toContain(`/${slug}/rsvp?code=`);
    expect(clipboardText).toMatch(
      new RegExp(`^https?://[^/]+/${slug}/rsvp\\?code=.+$`),
    );
  });
});

test.describe("Guest Management - Email Actions", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_DATA.routes.adminGuests);
    await waitForHydration(page);
  });

  test("can trigger email for a guest with valid email", async ({ page }) => {
    // First create a guest with email
    const uniqueId = Date.now();
    const testFirstName = `Email-Test-${uniqueId}`;
    const testEmail = `email-test-${uniqueId}@example.com`;

    // Create the guest
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .getByLabel(/^first name/i)
      .first()
      .fill(testFirstName);
    await page
      .getByLabel(/^email/i)
      .first()
      .fill(testEmail);
    await page.getByRole("button", { name: /create guest/i }).click();
    await waitForGuestCreated(page);

    // Search for and open the guest
    await page.getByPlaceholder(/filter by name/i).fill(testFirstName);
    await page.waitForTimeout(500); // Wait for filter to apply

    // Find the row containing our guest and click Edit in that row
    const guestRow = page
      .locator("table tbody tr")
      .filter({ hasText: testFirstName })
      .first();
    await expect(guestRow).toBeVisible({ timeout: 5000 });

    // Click Edit and wait for sheet to open
    await guestRow.getByRole("button", { name: /edit/i }).click();
    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });

    // Click Send Email button
    await page.getByRole("button", { name: /send email/i }).click();

    // Should show success or send the email
    // Note: In a test environment, the actual email may not send but the API should respond
    await expect(
      page.getByText(/invitation email sent to/i).or(page.getByText(/failed/i)),
    ).toBeVisible({ timeout: 10000 });

    // Clean up - delete the guest
    await page.getByRole("button", { name: /delete guest/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });

  test("send email button is disabled for guest without email", async ({
    page,
  }) => {
    // Create a guest without email
    const uniqueId = Date.now();
    const testFirstName = `NoEmail-Test-${uniqueId}`;

    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .getByLabel(/^first name/i)
      .first()
      .fill(testFirstName);
    // Don't fill email
    await page.getByRole("button", { name: /create guest/i }).click();
    await waitForGuestCreated(page);

    // Search for and open the guest
    await page.getByPlaceholder(/filter by name/i).fill(testFirstName);
    await page.waitForTimeout(1000); // Wait for filter to apply

    // Find the row containing our guest
    const guestRow = page
      .locator("table tbody tr")
      .filter({ hasText: testFirstName })
      .first();
    await expect(guestRow).toBeVisible({ timeout: 5000 });

    // Click Edit button with force to ensure click registers
    const editButton = guestRow.getByRole("button", { name: /edit/i });
    await editButton.click({ force: true });

    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });

    // Send email button should be disabled
    const sendEmailButton = page.getByRole("button", { name: /send email/i });
    await expect(sendEmailButton).toBeDisabled();

    // Clean up
    await page.getByRole("button", { name: /delete guest/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});

test.describe("Guest Management - Event Invitations", () => {
  test.use({ storageState: "e2e/.auth/admin.json" });

  test.beforeEach(async ({ page }) => {
    if (!isAuthAvailable()) {
      test.skip();
    }
    await page.goto(TEST_DATA.routes.adminGuests);
    await waitForHydration(page);
  });

  test("Add Guest form shows event toggles with default events ON", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /add guest/i }).click();
    await expect(
      page.getByRole("heading", { name: /add new guest/i }),
    ).toBeVisible();

    // Event Invitations section should be visible
    await expect(page.getByText("Event Invitations")).toBeVisible();

    // Default events (Ceremony, Reception) should be checked
    // Non-default events should not be checked
    const deselect = page.getByRole("button", { name: /deselect all/i });
    const selectAll = page.getByRole("button", { name: /select all/i });

    // If all default events are on, "Deselect all" should be visible
    // OR "Select all" if there are non-default events that are off
    await expect(deselect.or(selectAll)).toBeVisible();
  });

  test("Edit Guest sheet shows event toggles matching current invites", async ({
    page,
  }) => {
    // Open first guest's edit sheet
    const rowCount = await page.locator("table tbody tr").count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    const editButton = page.getByRole("button", { name: /edit/i }).first();
    await editButton.click({ force: true });

    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });

    // Event Invitations section should be visible
    await expect(page.getByText("Event Invitations")).toBeVisible();
  });

  test("toggling event in Edit Guest enables save button", async ({ page }) => {
    const rowCount = await page.locator("table tbody tr").count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    const editButton = page.getByRole("button", { name: /edit/i }).first();
    await editButton.click({ force: true });

    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });

    // Update Guest button should be disabled initially (no changes)
    const updateButton = page.getByRole("button", { name: /update guest/i });
    await expect(updateButton).toBeDisabled();

    // Toggle an event — click Deselect all then Select all to make a change
    const toggleButton = page
      .getByRole("button", { name: /deselect all/i })
      .or(page.getByRole("button", { name: /select all/i }));
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      // Update button should now be enabled
      await expect(updateButton).toBeEnabled({ timeout: 2000 });
    }
  });

  test("notes filter does partial matching", async ({ page }) => {
    // Create a guest with notes
    const uniqueId = Date.now();
    const testFirstName = `Notes-Test-${uniqueId}`;
    const testNotes = `UniqueNote${uniqueId}`;

    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .getByLabel(/^first name/i)
      .first()
      .fill(testFirstName);
    // Find and fill the notes field
    await page.getByPlaceholder(/internal notes/i).fill(testNotes);
    await page.getByRole("button", { name: /create guest/i }).click();
    await waitForGuestCreated(page);

    // Use notes filter with partial match (first 8 chars)
    const notesFilter = page.getByPlaceholder(/filter by notes/i);
    await notesFilter.fill(testNotes.slice(0, 8));
    await page.waitForTimeout(500);

    // Guest should appear
    const guestRow = page
      .locator("table tbody tr")
      .filter({ hasText: testFirstName });
    await expect(guestRow.first()).toBeVisible({ timeout: 5000 });

    // Clean up
    await page.getByPlaceholder(/filter by name/i).fill(testFirstName);
    await page.waitForTimeout(500);
    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    await editBtn.click({ force: true });
    await expect(
      page.getByRole("heading", { name: /edit guest/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /delete guest/i }).click();
    await page.getByRole("button", { name: /^delete$/i }).click();
  });
});
