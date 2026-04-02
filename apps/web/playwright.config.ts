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
config({ path: path.resolve(__dirname, ".env.local"), override: true });

/**
 * Read-only spec files that don't mutate the DB.
 * These can safely run in parallel with each other.
 */
const readOnlySpecs = [
  "admin-auth.noauth.spec.ts",
  "things-to-do.noauth.spec.ts",
  "registry.noauth.spec.ts",
  "trip-planner.noauth.spec.ts",
  "platform-admin.spec.ts",
  // Read-only admin pages (display only, no DB mutations)
  "admin-calendar.spec.ts",
  "admin-api-docs.spec.ts",
  "admin-gifts.spec.ts",
  // Read-only public pages
  "hotels.noauth.spec.ts",
  "vendors.noauth.spec.ts",
  "events-rsvp.noauth.spec.ts",
  "auth-pages.noauth.spec.ts",
];

const readOnlyPattern = readOnlySpecs.map((f) => `**/${f}`);

/**
 * Playwright configuration for E2E testing
 *
 * CI: Tests run against a Vercel preview deployment with a freshly seeded database.
 * Local: Tests run against the local dev server (starts automatically if not running).
 *
 * Test execution order on CI:
 * 1. global-setup → setup (auth)
 * 2. Read-only tests (parallel, multiple workers) — fast
 * 3. Mutating tests (sequential, 1 worker) — safe DB access
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

    // --- Read-only tests: safe to parallelize ---

    // Authenticated read-only tests (parallel)
    {
      name: "readonly-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testMatch: readOnlyPattern.filter((p) => !p.includes(".noauth.")),
      ...(process.env.CI && { workers: 3 }),
    },
    // Unauthenticated read-only tests (parallel)
    {
      name: "readonly-noauth",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
      testMatch: readOnlyPattern.filter((p) => p.includes(".noauth.")),
      ...(process.env.CI && { workers: 3 }),
    },

    // --- Mutating tests: must run sequentially ---

    // Authenticated mutating tests (1 worker on CI)
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup", "readonly-auth", "readonly-noauth"],
      testIgnore: [
        /.*\.noauth\.spec\.ts/,
        ...readOnlyPattern.map((p) => new RegExp(p.replace("**/", ""))),
      ],
      ...(process.env.CI && { workers: 1 }),
    },
    // Unauthenticated mutating tests (1 worker on CI)
    {
      name: "chromium-no-auth",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup", "readonly-auth", "readonly-noauth"],
      testMatch: /.*\.noauth\.spec\.ts/,
      testIgnore: readOnlyPattern.map((p) => new RegExp(p.replace("**/", ""))),
      ...(process.env.CI && { workers: 1 }),
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
