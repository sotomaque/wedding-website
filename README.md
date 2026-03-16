# Wedding Website

A wedding website built with Next.js 16 (App Router), React 19, and TypeScript in a Turborepo monorepo.

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 16 (App Router)             |
| Language       | TypeScript 5.7+ (strict)            |
| Package Mgr    | Bun                                 |
| Styling        | Tailwind CSS 4                      |
| Components     | shadcn/ui (Radix UI)                |
| Database       | Supabase (PostgreSQL) + Kysely ORM  |
| Auth           | Clerk                               |
| Email          | Resend (templates)                  |
| Payments       | Stripe                              |
| File Uploads   | UploadThing                         |
| Linting        | Biome                               |
| API Docs       | next-openapi-gen + Swagger UI       |
| CI             | GitHub Actions                      |
| Hosting        | Vercel                              |

## Features

### Public Website
- Photo galleries with randomized display
- Event details, schedule, and interactive venue maps
- RSVP system with dietary restrictions, plus-ones, and attendance tracking
- Gift registry via Stripe payment links
- Hotels page with interest tracking
- Things to do recommendations
- Dark/light mode, responsive design, SEO optimized

### Guest Photo Sharing
- Guests scan a QR code at the reception and upload photos from their phones at `/photos/upload` (no login required)
- Photos appear immediately on a live `/slideshow` page with crossfade transitions, uploader name attribution, and auto-refresh every 30 seconds
- The slideshow displays a QR code in the corner so guests watching can upload directly
- Admins can hide or permanently delete photos from `/admin/photos/guest`
- Download all guest photos as a single ZIP archive from the admin dashboard

### Admin Dashboard (`/admin`)
- Guest management with tier lists (A/B/C priority)
- Real-time RSVP tracking and bulk email actions
- Seating chart editor with AI-powered generation
- Gift registry statistics
- Event management with per-event RSVPs
- Hotel management
- Wedding todo list
- Guest photo moderation with bulk ZIP download
- Service links dashboard (GitHub, Vercel, Supabase, Clerk, Stripe, Resend)

### API Documentation (`/admin/api-docs`)

Interactive API documentation powered by [next-openapi-gen](https://github.com/nicobao/next-openapi-gen) and [Swagger UI](https://swagger.io/tools/swagger-ui/). The OpenAPI spec is auto-generated from JSDoc annotations across all 30 API route handlers.

- **Swagger UI** - Browse and test every endpoint from the browser
- **Quick API Tester** - Built-in panel with pre-configured sample requests for health checks, RSVP, guests, events, gifts, and more
- **Regenerate the spec** with `bun run generate:openapi` (outputs `public/openapi.json`)

## Monorepo Structure

```
apps/web/                  Next.js frontend + API routes
  app/                     App Router pages and routes
  app/admin/               Admin dashboard
  app/api/                 API routes (RSVP, webhooks, admin, e2e)
  components/              Reusable React components
  lib/                     Utilities, DB client, auth, email, validations
  __tests__/               Unit tests (Bun test)
  e2e/                     E2E tests (Playwright)
packages/ui/               Shared UI components (shadcn/ui)
packages/typescript-config/ Shared TS configs
supabase/
  config.toml              Supabase CLI configuration
  migrations/              Numbered SQL migration files (000-030)
  seed.sql                 Local development seed data
.github/workflows/         CI pipeline
```

## Getting Started

```bash
bun install                                     # Install dependencies
cp apps/web/.env.example apps/web/.env          # Copy env template
# Fill in your .env values (see Environment Variables below)
bun run dev                                     # Start dev server at localhost:3000
```

## Commands

```bash
bun run dev            # Start dev server (Turborepo)
bun run build          # Production build
bun run lint           # Biome lint check
bun run lint:fix       # Biome auto-fix
bun run typecheck      # TypeScript type check
bun run test           # Unit tests (Bun test)
bun run test:e2e       # E2E tests (Playwright)
bun run knip           # Dead code / unused dependency detection
```

---

## Git Hooks (Lefthook)

Git hooks are managed by [Lefthook](https://github.com/evilmartians/lefthook) (not Husky). Hooks install automatically via the `prepare` script on `bun install`.

| Hook         | What it does                                          |
| ------------ | ----------------------------------------------------- |
| `pre-commit` | Biome check + auto-fix on staged files                |
| `pre-push`   | Typecheck and unit tests in parallel                  |

Configuration: [`lefthook.yml`](lefthook.yml)

If hooks aren't firing:

```bash
git config --get core.hooksPath   # should return nothing
bunx lefthook install              # re-install if needed
```

---

## Environment Variables

Validated at build time via `@t3-oss/env-nextjs` in [`apps/web/env.ts`](apps/web/env.ts). See [`apps/web/.env.example`](apps/web/.env.example) for a full template.

### Server-side

| Variable                          | Required | Description                                        |
| --------------------------------- | -------- | -------------------------------------------------- |
| `POSTGRES_URL`                    | Yes*     | Supabase connection string (auto-set by Supabase Vercel integration) |
| `DATABASE_URL`                    | Yes*     | Local dev fallback for database connection          |
| `CLERK_SECRET_KEY`                | Yes      | Clerk authentication secret                         |
| `ADMIN_EMAILS`                    | Yes      | Comma-separated admin email allowlist               |
| `RESEND_API_KEY`                  | No       | Resend email API key                                |
| `RSVP_EMAIL`                      | No       | Comma-separated RSVP notification recipients        |
| `UPLOADTHING_TOKEN`               | No       | UploadThing file upload token                       |
| `OPENAI_API_KEY`                  | No       | OpenAI key for AI seating chart generation          |
| `STRIPE_SECRET_KEY`               | No       | Stripe payments secret key                          |
| `STRIPE_WEBHOOK_SECRET`           | No       | Stripe webhook verification secret                  |
| `STRIPE_PRODUCT_*`                | No       | Stripe product IDs for gift registry                |
| `E2E_TEST_MODE`                   | No       | `"true"` skips real email sending (default: `"false"`) |
| `E2E_RESET_SECRET`                | No       | Shared secret for the database reset endpoint       |
| `VERCEL_ENV`                      | No       | Auto-set by Vercel (`production` / `preview` / `development`) |

*At least one of `POSTGRES_URL` or `DATABASE_URL` must be set. On Vercel, `POSTGRES_URL` is auto-injected by the Supabase integration per environment. For local dev, set `DATABASE_URL` in `.env`.

### Client-side (`NEXT_PUBLIC_`)

| Variable                                | Description                              |
| --------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`     | Clerk publishable key                    |
| `NEXT_PUBLIC_APP_URL`                   | App URL for email links                  |
| `NEXT_PUBLIC_RSVP_EMAIL`               | Display email in footer                  |
| `NEXT_PUBLIC_ADMIN_EMAILS`             | Client-side admin check                  |
| `NEXT_PUBLIC_STRIPE_LINK_*`            | Stripe payment links for registry        |

### Turborepo Env Passthrough

All env vars consumed at build time must be declared in [`turbo.json`](turbo.json) under `tasks.build.env`. If you add a new build-time env var, add it there or Vercel builds won't see it.

---

## Database & Supabase

### Connection

The app connects to Supabase PostgreSQL via [Kysely](https://kysely.dev/) with the `pg` library ([`apps/web/lib/db/index.ts`](apps/web/lib/db/index.ts)). The connection prefers `POSTGRES_URL` (set by the Supabase Vercel integration per environment) and falls back to `DATABASE_URL` (for local dev).

SSL is configured explicitly with `rejectUnauthorized: false` to support Supabase preview branch certificates. The `sslmode` parameter is stripped from the connection string to prevent the `pg` library from overriding this.

### Migrations

Migrations live in [`supabase/migrations/`](supabase/migrations/) and are numbered sequentially (`000_`, `001_`, ..., `029_`).

**How Supabase runs migrations:**

- Supabase tracks applied migrations in `supabase_migrations.schema_migrations`
- Each migration runs exactly once, in order, and is never re-run
- On preview branches, ALL migrations run from scratch on a fresh database
- On production, only new (unapplied) migrations run

**Writing new migrations:**

1. Create a new file: `supabase/migrations/NNN_description.sql` (next sequential number)
2. **All statements must be idempotent** (safe to re-run). Use these patterns:

   ```sql
   -- Tables
   CREATE TABLE IF NOT EXISTS my_table (...);

   -- Columns
   ALTER TABLE my_table ADD COLUMN IF NOT EXISTS my_col TEXT;

   -- Indexes
   CREATE INDEX IF NOT EXISTS idx_name ON my_table(col);

   -- Constraints (no IF NOT EXISTS in PostgreSQL — use DO block)
   DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'my_constraint') THEN
       ALTER TABLE my_table ADD CONSTRAINT my_constraint CHECK (...);
     END IF;
   END $$;

   -- Policies (drop + recreate)
   DROP POLICY IF EXISTS "my_policy" ON my_table;
   CREATE POLICY "my_policy" ON my_table FOR SELECT USING (true);

   -- Triggers (drop + recreate)
   DROP TRIGGER IF EXISTS my_trigger ON my_table;
   CREATE TRIGGER my_trigger ...;

   -- Functions (always idempotent)
   CREATE OR REPLACE FUNCTION my_func() ...;

   -- Seed data (use WHERE NOT EXISTS or ON CONFLICT)
   INSERT INTO my_table (name) SELECT 'value'
     WHERE NOT EXISTS (SELECT 1 FROM my_table WHERE name = 'value');
   ```

3. **Never modify** an existing migration that has already run on production
4. Test by pushing your branch and verifying the Supabase preview branch applies cleanly

**Base schema:** Migration `000_initial_schema.sql` creates the foundational tables (`guests`, `activities`, `guest_activity_interests`, `photos`, `parties`) that existed before migration history was introduced. All subsequent migrations build on these.

### Ephemeral Preview Databases (Supabase Branching)

When you push a branch with a PR, Supabase automatically creates an **ephemeral preview database**:

1. A fresh PostgreSQL instance is provisioned for the branch
2. All migrations run from `000` to latest on the empty database
3. The Supabase Vercel integration injects `POSTGRES_URL` pointing to this preview database (not production)
4. The preview database is cleaned up when the branch is deleted

This means:
- Every PR gets its own isolated database
- Preview deployments never touch the production database
- Destructive migrations can be safely tested on preview
- The E2E pipeline resets and seeds the preview database before each test run

### Row Level Security (RLS)

All tables have RLS enabled (see `029_enable_rls_all_tables.sql`). The app connects using credentials that bypass RLS, so this is a defense-in-depth measure against direct `anon` key access.

| Table                      | Public Read | Public Write | Notes                         |
| -------------------------- | ----------- | ------------ | ----------------------------- |
| `guests`                   | Yes         | Yes          | RSVP flow                     |
| `parties`                  | Yes         | Yes          | RSVP flow                     |
| `activities`               | Yes         | No           | Display only                  |
| `guest_activity_interests` | Yes         | Yes          | Activity signup               |
| `photos`                   | Yes         | No           | Gallery display               |
| `events`                   | Yes         | No           | RSVP page display             |
| `hotels`                   | Yes         | No           | Hotels page display           |
| `guest_event_invites`      | Yes         | Update only  | RSVP flow                     |
| `guest_hotel_interests`    | Yes         | Full CRUD    | Hotel interest flow           |
| `gifts`                    | No          | No           | Admin only (service_role)     |
| `seating_charts`           | No          | No           | Admin only (service_role)     |
| `seating_tables`           | No          | No           | Admin only (service_role)     |
| `guest_table_assignments`  | No          | No           | Admin only (service_role)     |
| `wedding_todos`            | No          | No           | Admin only (service_role)     |
| `guest_photos`             | Yes (visible only) | Yes   | Guest photo uploads; public read filtered by `is_visible = true` |

Admin-only tables have RLS enabled with no public policies. All admin operations use `service_role` which bypasses RLS.

When adding new tables, always enable RLS and add appropriate policies in the same migration.

---

## CI Pipeline

Defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Jobs

| Job        | Trigger        | What it does                                          |
| ---------- | -------------- | ----------------------------------------------------- |
| `lint`     | Push + PR      | Biome linter                                          |
| `knip`     | Push + PR      | Unused code and dependency detection                  |
| `typecheck`| Push + PR      | TypeScript type checking                              |
| `test`     | Push + PR      | Bun unit tests                                        |
| `e2e`      | PR only        | Playwright E2E tests against Vercel preview           |

### E2E Pipeline Flow

The `e2e` job runs only on PRs and depends on all other jobs passing:

```
lint + knip + typecheck + test  -->  e2e
```

1. **Wait for Vercel preview** - Polls until the preview deployment is ready (uses `VERCEL_AUTOMATION_BYPASS_SECRET` to bypass deployment protection)
2. **Reset preview database** - POSTs to `/api/e2e/reset` to truncate and re-seed with deterministic test data
3. **Run Playwright tests** - Authenticated (admin) and unauthenticated test suites
4. **Upload artifacts** - Playwright HTML report for debugging failures

### Required GitHub Actions Secrets

| Secret                              | Used by                    |
| ----------------------------------- | -------------------------- |
| `CLERK_SECRET_KEY`                  | E2E auth setup             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | E2E auth setup             |
| `TEST_ADMIN_EMAIL`                  | E2E admin login            |
| `TEST_ADMIN_PASSWORD`               | E2E admin login            |
| `ADMIN_EMAILS`                      | E2E admin check            |
| `NEXT_PUBLIC_ADMIN_EMAILS`          | E2E admin check            |
| `E2E_RESET_SECRET`                  | DB reset endpoint          |
| `VERCEL_AUTOMATION_BYPASS_SECRET`   | Deployment protection      |

### Required Vercel Env Vars (Preview only)

| Variable            | Value    | Notes                                          |
| ------------------- | -------- | ---------------------------------------------- |
| `E2E_TEST_MODE`     | `true`   | Skips real email sending on preview             |
| `E2E_RESET_SECRET`  | (secret) | Must match the GitHub Actions secret            |
| `POSTGRES_URL`      | (auto)   | Auto-injected by Supabase Vercel integration    |

### Database Reset Safety Guards

The `/api/e2e/reset` endpoint has triple protection against accidental production resets:

1. **Environment check** - Only responds when `VERCEL_ENV=preview`
2. **Project ref check** - Refuses if the database URL contains the production Supabase project ref
3. **Shared secret** - Requires `x-e2e-reset-token` header matching `E2E_RESET_SECRET`

---

## Testing

### Unit Tests

- **Location:** `apps/web/__tests__/`
- **Framework:** Bun test
- **Run:** `bun run test`

### E2E Tests

- **Location:** `apps/web/e2e/`
- **Framework:** Playwright
- **Run:** `bun run test:e2e`
- Locally: runs against the local dev server (starts automatically)
- CI: runs against the Vercel preview deployment

**Running locally against a preview deployment:**

The Vercel preview URL follows the pattern:
`https://wedding-website-web-git-<branch>-<vercel-scope>.vercel.app`

You can find it in the PR's deployment status or the Vercel dashboard.

```bash
# Run all E2E tests against a preview deployment:
PLAYWRIGHT_TEST_BASE_URL=https://wedding-website-web-git-feat-xxx-enriques-projects-b7c71f69.vercel.app \
CI=1 \
bun run test:e2e

# Run a specific test by name:
PLAYWRIGHT_TEST_BASE_URL=https://wedding-website-web-git-feat-xxx-enriques-projects-b7c71f69.vercel.app \
CI=1 \
bun run test:e2e -- --grep "attendance summary"
```

Setting `CI=1` prevents Playwright from starting a local dev server and enables retries. Requires Clerk and admin env vars in `apps/web/.env`.

---

## Customization

- **Wedding details:** `apps/web/app/constants.ts` (dates, names, content)
- **Site config:** `apps/web/app/site-config.ts` (metadata, dates)
- **Navigation:** `apps/web/app/navigation-config.ts`
- **Theme/colors:** `packages/ui/src/styles/globals.css`
- **Photos:** Place in `apps/web/public/our-photos/` and update `HERO_PHOTOS` in constants

## Adding shadcn/ui Components

```bash
bunx shadcn@latest add button -c apps/web
```

Components go to `packages/ui/src/components/`. Import with:

```tsx
import { Button } from "@workspace/ui/components/button"
```
