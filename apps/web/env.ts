import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables.
   */
  server: {
    RESEND_API_KEY: z.string().optional(),
    RSVP_EMAIL: z.string().optional(), // Fallback notification emails (per-wedding config preferred)
    CLERK_SECRET_KEY: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(), // Superadmin fallback (per-wedding admins preferred)
    POSTGRES_URL: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    UPLOADTHING_TOKEN: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRODUCT_BABY_FUND: z.string().optional(), // Fallback (per-wedding registry_items preferred)
    STRIPE_PRODUCT_HONEYMOON: z.string().optional(),
    STRIPE_PRODUCT_STUDENT_LOANS: z.string().optional(),
    DEFAULT_WEDDING_SLUG: z.string().optional(),
    E2E_TEST_MODE: z.enum(["true", "false"]).default("false"),
    E2E_RESET_SECRET: z.string().optional(),
    LOCAL_E2E_MODE: z.enum(["true", "false"]).optional(),
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    CRON_SECRET: z.string().optional(),
  },

  /**
   * Client-side environment variables (prefixed with NEXT_PUBLIC_).
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
    NEXT_PUBLIC_GEOAPIFY_API_KEY: z.string().optional(),
  },

  /**
   * Runtime env destructuring.
   */
  runtimeEnv: {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RSVP_EMAIL: process.env.RSVP_EMAIL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    POSTGRES_URL: process.env.POSTGRES_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRODUCT_BABY_FUND: process.env.STRIPE_PRODUCT_BABY_FUND,
    STRIPE_PRODUCT_HONEYMOON: process.env.STRIPE_PRODUCT_HONEYMOON,
    STRIPE_PRODUCT_STUDENT_LOANS: process.env.STRIPE_PRODUCT_STUDENT_LOANS,
    DEFAULT_WEDDING_SLUG: process.env.DEFAULT_WEDDING_SLUG,
    E2E_TEST_MODE: process.env.E2E_TEST_MODE,
    E2E_RESET_SECRET: process.env.E2E_RESET_SECRET,
    LOCAL_E2E_MODE: process.env.LOCAL_E2E_MODE,
    VERCEL_ENV: process.env.VERCEL_ENV,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_GEOAPIFY_API_KEY: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
