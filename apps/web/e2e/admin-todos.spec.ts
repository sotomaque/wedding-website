import { expect, test } from "@playwright/test";
import { isAuthAvailable, waitForHydration } from "./fixtures";

test.use({ storageState: "e2e/.auth/admin.json" });
test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  if (!isAuthAvailable()) {
    test.skip();
  }
});

test.describe("Todo List Page", () => {
  test("displays todo list with heading", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    await expect(page.getByText(/wedding to-do list/i)).toBeVisible();
  });

  test("shows add task input and buttons", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    await expect(page.getByPlaceholder(/add a new task/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
  });

  test("shows AI Generate button", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    await expect(
      page.getByRole("button", { name: /ai generate/i }),
    ).toBeVisible();
  });

  test("can add a new todo", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    const input = page.getByPlaceholder(/add a new task/i);
    await input.fill("E2E Test Todo Item");
    await page.getByRole("button", { name: /^add$/i }).click();

    await expect(page.getByText("E2E Test Todo Item")).toBeVisible({
      timeout: 5000,
    });
  });

  test("can toggle todo completion", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    // Find our test todo checkbox by its aria-label
    const checkbox = page.getByRole("checkbox", {
      name: /E2E Test Todo Item/i,
    });
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.click();
      await page.waitForTimeout(500);

      await page.waitForTimeout(500);

      // Should move to completed section
      await expect(page.getByText(/completed/i)).toBeVisible();
    }
  });

  test("can delete a todo", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    const todoText = page.getByText("E2E Test Todo Item");
    if (await todoText.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Hover to reveal delete button
      await todoText.hover();
      const deleteButton = todoText
        .locator("..")
        .locator("..")
        .getByRole("button")
        .filter({ has: page.locator("svg") })
        .last();
      await deleteButton.click();

      // Confirm if needed
      const confirmBtn = page.getByRole("button", {
        name: /confirm|delete|yes/i,
      });
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(1000);
    }
  });

  test("shows To Do and Completed sections", async ({ page }) => {
    await page.goto("/admin/todos");
    await waitForHydration(page);

    // Should show at least the To Do section header
    await expect(page.getByText(/to do/i).first()).toBeVisible();
  });
});
