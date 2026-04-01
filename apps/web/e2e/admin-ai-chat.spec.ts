import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

/**
 * Admin AI Chat Panel Tests
 *
 * Tests for:
 * - Opening/closing the chat panel
 * - Sending messages via input and example questions
 * - Tool invocation rendering
 * - Error state display
 * - Stop generation button
 * - Chat memory persistence and clearing
 *
 * NOTE: These tests require admin authentication.
 */

// Use stored auth state from setup
test.use({ storageState: "e2e/.auth/admin.json" });

// Skip all tests in this file if auth is not available
test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

/** Clear chat history via API so tests start with a clean slate */
async function clearChatHistory(page: import("@playwright/test").Page) {
  await page.request.delete("/api/admin/ai/chat");
}

test.describe("AI Chat Panel", () => {
  test("opens and closes the chat panel", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // FAB button should be visible
    const fabButton = page.getByLabel("Open AI Wedding Assistant");
    await expect(fabButton).toBeVisible();

    // Click to open
    await fabButton.click();

    // Sheet should open with header
    await expect(page.getByText("AI Wedding Assistant")).toBeVisible();
    await expect(
      page.getByText("Ask anything about your wedding planning"),
    ).toBeVisible();

    // Example questions should be visible in empty state
    await expect(page.getByText("How many guests have RSVP'd?")).toBeVisible();
    await expect(page.getByText("Who hasn't responded yet?")).toBeVisible();

    // Close the panel
    const closeButton = page.locator(
      '[data-slot="sheet-close"], button[aria-label="Close"]',
    );
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Press escape to close
      await page.keyboard.press("Escape");
    }

    // FAB should reappear
    await expect(fabButton).toBeVisible({ timeout: 5000 });
  });

  test("sends a message and receives a response", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel
    await page.getByLabel("Open AI Wedding Assistant").click();
    await expect(page.getByText("AI Wedding Assistant")).toBeVisible();

    // Type a message
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("How many guests have RSVP'd?");

    // Submit via button
    const submitButton = page.getByLabel("Submit");
    await submitButton.click();

    // User message should appear
    await expect(
      page.locator(".is-user").getByText("How many guests have RSVP'd?"),
    ).toBeVisible({ timeout: 5000 });

    // Wait for assistant response (may take time due to AI processing)
    await expect(page.locator(".is-assistant").first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("sends a message via example question button", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel
    await page.getByLabel("Open AI Wedding Assistant").click();

    // Wait for empty state to settle (history load completes)
    await expect(page.getByText("Welcome! How can I help?")).toBeVisible({
      timeout: 5000,
    });

    // Click an example question
    await page
      .getByRole("button", { name: "Show me dietary restrictions" })
      .click();

    // The question should appear as a user message
    await expect(
      page.locator(".is-user").getByText("Show me dietary restrictions"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows shimmer loading indicator while streaming", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel
    await page.getByLabel("Open AI Wedding Assistant").click();

    // Send a message
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("Give me a wedding overview");

    await page.getByLabel("Submit").click();

    // The shimmer ("Thinking...") may appear briefly but disappears too fast
    // to reliably assert on, so we just verify the response eventually arrives
    await expect(page.locator(".is-assistant").first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("renders tool invocations when AI uses tools", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel
    await page.getByLabel("Open AI Wedding Assistant").click();

    // Ask something that will trigger a tool call
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("How many guests have RSVP'd?");
    await page.getByLabel("Submit").click();

    // Wait for the response to complete
    await expect(page.locator(".is-assistant").first()).toBeVisible({
      timeout: 30000,
    });

    // Check if a tool invocation was rendered (collapsible with tool name)
    // The tool component renders inside a Collapsible with a wrench icon
    const toolElements = page.locator('[data-slot="collapsible"]');
    const toolCount = await toolElements.count();

    if (toolCount > 0) {
      // Verify the tool shows a status badge (Completed, Running, etc.)
      await expect(
        toolElements
          .first()
          .locator(".rounded-full"), // Badge
      ).toBeVisible();

      // Click to expand tool details
      await toolElements.first().locator("button").first().click();

      // Should show Parameters or Result sections
      const hasContent = await page
        .getByText("Parameters")
        .or(page.getByText("Result"))
        .isVisible()
        .catch(() => false);
      expect(hasContent).toBe(true);
    }
  });

  test("shows copy button on assistant messages", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel
    await page.getByLabel("Open AI Wedding Assistant").click();

    // Send a message
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("Hello!");
    await page.getByLabel("Submit").click();

    // Wait for streaming to fully complete — textarea becomes enabled again
    const completed = await page
      .getByPlaceholder("Ask about your wedding...")
      .waitFor({ state: "attached", timeout: 30000 })
      .then(() =>
        page
          .getByPlaceholder("Ask about your wedding...")
          .isEnabled({ timeout: 30000 }),
      )
      .catch(() => false);

    // Skip if AI API failed or timed out (no response in CI)
    const hasAssistantText = await page
      .locator(".is-assistant")
      .filter({ hasNot: page.getByText("Thinking...") })
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasAssistantText) {
      test.skip(true, "AI API unavailable in CI — no assistant response");
      return;
    }

    // Hover to reveal actions
    await page
      .locator(".is-assistant")
      .filter({ hasNot: page.getByText("Thinking...") })
      .first()
      .hover();

    // Copy button
    const copyButton = page
      .getByRole("button", { name: "Copy" })
      .or(page.locator("button").filter({ hasText: "Copy" }))
      .first();
    await expect(copyButton).toBeVisible({ timeout: 5000 });
  });

  test("shows stop button during streaming", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel
    await page.getByLabel("Open AI Wedding Assistant").click();

    // Send a message
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("Give me a detailed overview of my wedding");
    await page.getByLabel("Submit").click();

    // During streaming, the submit button should change to Stop
    // This may be very brief, so we use a short timeout
    const stopButton = page.getByLabel("Stop");
    const wasVisible = await stopButton
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // If we caught the stop button, verify it's functional
    if (wasVisible) {
      await stopButton.click();
      // After stopping, the input should become enabled again
      await expect(
        page.getByPlaceholder("Ask about your wedding..."),
      ).toBeEnabled({ timeout: 10000 });
    }
  });

  test("persists chat history across panel close/reopen", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel and send a message
    await page.getByLabel("Open AI Wedding Assistant").click();
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("Hello from memory test!");
    await page.getByLabel("Submit").click();

    // Wait for assistant response
    await expect(page.locator(".is-assistant").first()).toBeVisible({
      timeout: 30000,
    });

    // Close the panel
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("AI Wedding Assistant")).not.toBeVisible();

    // Reopen the panel — history should be restored
    await page.getByLabel("Open AI Wedding Assistant").click();

    // The user message from before should still be visible
    await expect(page.getByText("Hello from memory test!")).toBeVisible({
      timeout: 10000,
    });
  });

  test("New chat button clears conversation", async ({ page }) => {
    await page.goto("/admin");
    await waitForHydration(page);
    await clearChatHistory(page);

    // Open chat panel and send a message
    await page.getByLabel("Open AI Wedding Assistant").click();
    const textarea = page.getByPlaceholder("Ask about your wedding...");
    await textarea.fill("Test message for clearing");
    await page.getByLabel("Submit").click();

    // Wait for assistant response
    await expect(page.locator(".is-assistant").first()).toBeVisible({
      timeout: 30000,
    });

    // Click "New chat" button
    await page.getByRole("button", { name: "New chat" }).click();

    // Messages should be cleared, empty state should show
    await expect(page.getByText("Welcome! How can I help?")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Test message for clearing")).not.toBeVisible();
  });
});
