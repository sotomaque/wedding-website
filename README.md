# Wedding Website

A wedding website built with Next.js 16 (App Router), React 19, and TypeScript in a Turborepo monorepo.

## Tech Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| Runtime        | [Bun](https://bun.sh)                         |
| Framework      | [Next.js 16](https://nextjs.org) (App Router), React 19 |
| Database       | PostgreSQL via [Supabase](https://supabase.com) + [Prisma](https://prisma.io) |
| Auth           | [Clerk](https://clerk.com)                    |
| Styling        | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Email          | [Resend](https://resend.com) (templates)      |
| Payments       | [Stripe](https://stripe.com)                  |
| File Uploads   | [UploadThing](https://uploadthing.com)        |
| Quality        | Biome · Knip · Lefthook · Playwright E2E      |
| Hosting        | [Vercel](https://vercel.com)                  |

---

## Project structure

```
apps/web/          → Next.js frontend + API routes
packages/db/       → Prisma schema & client
packages/ui/       → Shared UI components (shadcn/ui)
supabase/          → Migrations + seed SQL
```

---

## Getting started

```bash
bun install
cp apps/web/.env.example apps/web/.env.local   # fill in your keys
bun dev                                        # start dev server
```

See [Environment file layout](#environment-file-layout) for detailed configuration.

---

## Development workflows

### Running local dev

1. Copy the example env and fill in your keys:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
2. Add your database URLs to `packages/db/.env` (Prisma reads connection strings from there).
3. Generate the Prisma client and start the dev server:
   ```bash
   cd packages/db && bun run db:generate
   bun dev
   ```

The app runs at `http://localhost:3000` with Turbopack HMR.

### Running against local Supabase

For fully offline development with seeded test data:

1. Start the local Supabase stack (PostgreSQL, Auth, Storage in Docker):
   ```bash
   bunx supabase start
   ```
2. Switch your environment to local:
   ```bash
   cd apps/web && bun run env:local
   ```
3. Reset the local database to apply all migrations and seed data:
   ```bash
   bunx supabase db reset
   ```
4. Generate the Prisma client (if not already done):
   ```bash
   cd packages/db && bun run db:generate
   ```
5. Start the dev server:
   ```bash
   bun dev
   ```

The local Supabase database runs on `localhost:54322` with seed data from `supabase/seed.sql`. Auth still goes through Clerk cloud, so you need valid Clerk dev keys.

### Running locally against production

To switch to the production database:

```bash
cd apps/web && bun run env:prod
```

This copies `apps/web/.env.local.prod` → `.env.local` and `packages/db/.env.prod` → `packages/db/.env`.

> **Tip:** The toggle scripts update both the web app env and the Prisma CLI env, so `prisma studio` and `prisma db push` will also point at the correct database.

### Switching back to local

```bash
cd apps/web && bun run env:local
```

### Environment file layout

```
apps/web/
  .env.local          ← active env for current session — gitignored, swapped by toggle scripts
  .env.local.local    ← local Supabase config — gitignored
  .env.local.prod     ← production config — gitignored
  .env.example        ← template with all required keys — committed

packages/db/
  .env                ← DB URLs for Prisma CLI — gitignored, swapped by toggle scripts
  .env.local-template ← local Supabase DB URLs — committed
  .env.prod           ← production DB URLs — gitignored
```

---

## Database (Supabase + Prisma)

The project uses **Supabase** for PostgreSQL with **Prisma** as the ORM. Schema changes go through Supabase migrations (not `prisma migrate`), and Prisma is used only for client generation and type-safe queries.

### How it works

- **Prisma schema** lives at `packages/db/prisma/schema.prisma` with PascalCase models (`Guest`, `Event`, `SeatingChart`) mapped to snake_case tables via `@@map()`
- **Prisma client** is generated into `node_modules/@prisma/client` and exported from `packages/db/src/index.ts` as `db`
- **Supabase migrations** in `supabase/migrations/` are the source of truth for schema changes
- **Connection**: Prisma reads `POSTGRES_PRISMA_URL` (pooled, port 6543) and `POSTGRES_URL_NON_POOLING` (direct, port 5432) from `packages/db/.env`

### Making schema changes

1. Edit `packages/db/prisma/schema.prisma`
2. Apply to local/dev DB: `cd packages/db && bunx prisma db push`
3. Generate migration: `cd packages/db && bun run db:migrate:new <descriptive_name>`
4. Verify: `bunx supabase db reset` (replays all migrations + seed)
5. Generate Prisma client: `cd packages/db && bun run db:generate`
6. Commit both `schema.prisma` and the new `supabase/migrations/<timestamp>_<name>.sql`

### Key commands

| Command | Description |
|---------|-------------|
| `cd packages/db && bun run db:generate` | Regenerate Prisma client |
| `cd packages/db && bun run db:push` | Push schema to local DB |
| `cd packages/db && bun run db:pull` | Pull schema from DB into schema.prisma |
| `cd packages/db && bun run db:migrate:new <name>` | Generate a new migration from schema diff |
| `cd packages/db && bun run db:reset` | Drop & recreate DB from migrations + seed |
| `cd packages/db && bun run db:studio` | Open Prisma Studio |

### Migrations

Migrations live in `supabase/migrations/` and are numbered sequentially (`000_`, `001_`, ...).

- Supabase tracks applied migrations in `supabase_migrations.schema_migrations`
- Each migration runs exactly once, in order, and is never re-run
- On preview branches, ALL migrations run from scratch on a fresh database
- On production, only new (unapplied) migrations run
- **Never modify** an existing migration that has already run on production

### Preview environments & deployment pipeline

The project uses **Supabase Branching** + **Vercel Previews** for a fully automated PR-to-production pipeline.

**When a PR is opened:**

1. **Supabase** creates an isolated preview database, runs all migrations, then applies `supabase/seed.sql`
2. **Vercel** deploys a preview of the app with the Supabase-provided preview DB env vars injected automatically
3. **CI** runs lint, typecheck, and unit tests; then E2E tests run against the Vercel preview URL

**When a PR is merged to `main`:**

1. **Supabase** deletes the preview branch database
2. **Supabase** applies any **new** migration files to the production database automatically
3. **Vercel** deploys to production (with production DB env vars)

> **Important:** Production migrations come from the `.sql` files in `supabase/migrations/`, not from Prisma's `db push`. The `db push` command does a direct schema diff and is only safe for local development.

---

## Features

### Public Website
- Photo galleries with randomized display
- Event details, schedule, and interactive venue maps
- RSVP system with dietary restrictions, plus-ones, and attendance tracking
- Gift registry via Stripe payment links
- Hotels page with interest tracking
- Things to do recommendations
- Dark/light mode, responsive design

### Guest Photo Sharing
- Guests scan a QR code at the reception and upload photos from their phones
- Photos appear immediately on a live slideshow page with crossfade transitions
- Admins can hide or permanently delete photos; download all as a ZIP archive

### Calendar Invites
- Attending guests automatically receive `.ics` calendar invites after RSVP
- Admins can trigger sends manually (per-guest or bulk)

### Admin Dashboard (`/admin`)
- Guest management with tier lists (A/B/C priority)
- Real-time RSVP tracking and bulk email actions
- Seating chart editor with AI-powered generation
- Gift registry statistics
- Event management with per-event RSVPs
- Hotel management
- Wedding todo list
- Guest photo moderation with bulk ZIP download

---

## Scripts reference

```bash
bun run dev                        # start all workspaces
bun run build                      # production build
```

| Command | Description |
|---------|-------------|
| `bun run lint` | Lint with Biome |
| `bun run typecheck` | TypeScript type-check |
| `bun run test` | Run unit tests |
| `bun run test:e2e` | Run E2E tests |
| `bun run knip` | Check for dead code and unused dependencies |
| `cd apps/web && bun run env:local` | Switch local env to local Supabase |
| `cd apps/web && bun run env:prod` | Switch local env to production DB |

---

## Testing

### Unit tests

Unit tests use `bun:test` and live in `apps/web/__tests__/`.

```bash
bun run test              # run all unit tests
```

### E2E tests

E2E tests use [Playwright](https://playwright.dev) with [Clerk Testing Tokens](https://clerk.com/docs/testing/playwright).

```bash
bun run test:e2e          # headless
bun run test:e2e:ui       # Playwright UI mode
bun run test:e2e:headed   # headed browser
```

---

## Code quality

### Git hooks (Lefthook)

[Lefthook](https://lefthook.dev) manages git hooks. Installed automatically on `bun install`.

| Hook | What runs |
|------|-----------|
| `pre-commit` | Biome check + auto-fix on staged files |
| `pre-push` | TypeScript typecheck and unit tests in parallel |

---

## Environment Variables

Validated at build time via `@t3-oss/env-nextjs` in `apps/web/env.ts`. See `apps/web/.env.example` for a full template.

### Server-side

| Variable | Required | Description |
|----------|----------|-------------|
| `CLERK_SECRET_KEY` | Yes | Clerk authentication secret |
| `ADMIN_EMAILS` | Yes | Comma-separated admin email allowlist |
| `DATABASE_URL` | No | Legacy fallback (Prisma uses `packages/db/.env` instead) |
| `RESEND_API_KEY` | No | Resend email API key |
| `RSVP_EMAIL` | No | Comma-separated RSVP notification recipients |
| `UPLOADTHING_TOKEN` | No | UploadThing file upload token |
| `OPENAI_API_KEY` | No | OpenAI key for AI seating chart generation |
| `STRIPE_SECRET_KEY` | No | Stripe payments secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook verification secret |

### Prisma (packages/db/.env)

| Variable | Description |
|----------|-------------|
| `POSTGRES_PRISMA_URL` | Pooled connection via PgBouncer (port 6543) — used at runtime |
| `POSTGRES_URL_NON_POOLING` | Direct connection (port 5432) — used by Prisma CLI |

### Client-side (`NEXT_PUBLIC_`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `NEXT_PUBLIC_APP_URL` | App URL for email links |
| `NEXT_PUBLIC_RSVP_EMAIL` | Display email in footer |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Client-side admin check |
| `NEXT_PUBLIC_STRIPE_LINK_*` | Stripe payment links for registry |

---

## Customization

- **Wedding details:** `apps/web/app/constants.ts` (dates, names, content)
- **Site config:** `apps/web/app/site-config.ts` (metadata, dates)
- **Navigation:** `apps/web/app/navigation-config.ts`
- **Theme/colors:** `packages/ui/src/styles/globals.css`

## Adding shadcn/ui Components

```bash
bunx shadcn@latest add button -c apps/web
```

Components go to `packages/ui/src/components/`. Import with:

```tsx
import { Button } from "@workspace/ui/components/button"
```
