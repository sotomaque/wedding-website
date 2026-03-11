import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

/**
 * Load environment variables from .env file
 * @see https://playwright.dev/docs/test-parameterize#env-files
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, ".env") });

/**
 * Playwright configuration for E2E testing
 *
 * CI: Tests run against a Vercel preview deployment with a freshly seeded database.
 * Local: Tests run against the local dev server (starts automatically if not running).
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI for DB consistency */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [["html", { open: "never" }], ["list"]],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",
    /* Take screenshot on failure */
    screenshot: "only-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    // Global setup - initializes Clerk testing token
    {
      name: "global-setup",
      testMatch: /global\.setup\.ts/,
    },
    // Setup project - authenticates admin user
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      dependencies: ["global-setup"],
    },
    // Authenticated tests (require admin login)
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: [/.*\.noauth\.spec\.ts/],
    },
    // Unauthenticated tests (depend on setup for test invite code)
    {
      name: "chromium-no-auth",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
      testMatch: /.*\.noauth\.spec\.ts/,
    },
  ],

  /* Run local dev server when not in CI (CI uses Vercel preview) */
  ...(!process.env.CI && {
    webServer: {
      command: "bun run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120 * 1000,
      env: {
        E2E_TEST_MODE: "true",
      },
    },
  }),
});
