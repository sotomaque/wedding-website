# WedPlan — Multi-Tenant Wedding Platform

A multi-tenant wedding platform where anyone can sign up, create a wedding website, and manage their entire wedding — guests, RSVPs, events, photos, registry, and more.

Built with Next.js 16 (App Router), React 19, TypeScript, Prisma, and Supabase in a Turborepo monorepo.

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
| Rich Text      | [Tiptap](https://tiptap.dev)                  |
| Quality        | Biome · Knip · Lefthook · Playwright E2E      |
| Hosting        | [Vercel](https://vercel.com)                  |

---

## How It Works

### User flow

1. **`/`** — Landing page with feature showcase and CTAs
2. **`/sign-up`** — Clerk sign-up → redirects to `/dashboard`
3. **`/dashboard`** — Lists user's weddings, or redirects to onboarding
4. **`/onboarding`** — 4-step wizard: names → slug → date/venue → create
5. **`/{slug}`** — Public wedding site (story, details, schedule, RSVP)
6. **`/{slug}/admin`** — Admin dashboard (guests, events, seating, photos, etc.)
7. **`/{slug}/admin/settings`** — Wedding config (general, notifications, branding, theme, features, admins)
8. **`/{slug}/admin/content`** — Content editor (hero, story, details, schedule, RSVP) with WYSIWYG
9. **`/platform-admin`** — Superadmin panel (all weddings, stats, moderation)

### Multi-tenancy architecture

- Every table has a `wedding_id` FK with NOT NULL constraint
- All Prisma queries scoped by `weddingId` (~54 files)
- Middleware extracts slug from URL, sets `x-wedding-slug` header
- `getWeddingId()` resolves wedding context per-request (cached via `React.cache()`)
- `requireAdmin(weddingId)` checks per-wedding admin access
- RLS policies on all tables as defense-in-depth
- Feature toggles per wedding (hotels, vendors, registry, etc.)
- 5 theme presets with CSS variable injection

---

## Project Structure

```
apps/web/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── [slug]/                  # Per-wedding pages (public + admin)
│   │   ├── page.tsx             # Wedding home (hero, story, details, schedule, RSVP)
│   │   ├── admin/               # Admin dashboard, guests, events, seating, settings, content
│   │   ├── rsvp/                # RSVP flow
│   │   ├── hotels/              # Hotel recommendations
│   │   ├── things-to-do/        # Activities
│   │   ├── registry/            # Gift registry
│   │   ├── vendors/             # Service links
│   │   ├── slideshow/           # Live photo slideshow
│   │   └── trip-planner/        # Guest trip calendar
│   ├── dashboard/               # My weddings list
│   ├── onboarding/              # Wedding creation wizard
│   ├── platform-admin/          # Superadmin panel
│   ├── sign-in/                 # Clerk sign-in
│   ├── sign-up/                 # Clerk sign-up
│   └── api/                     # API routes
├── components/                  # Shared React components
├── lib/                         # Utilities, DB, auth, email, validations
├── e2e/                         # Playwright E2E tests
└── __tests__/                   # Bun unit tests
packages/db/                     # Prisma schema & client
packages/ui/                     # Shared UI components (shadcn/ui)
supabase/                        # Migrations + seed SQL
```

---

## Getting Started

```bash
bun install
cp apps/web/.env.example apps/web/.env.local   # fill in your keys
bun dev                                        # start dev server → http://localhost:3000
```

### Running with local Supabase

```bash
bunx supabase start                            # start local PostgreSQL in Docker
cd apps/web && bun run env:local               # switch to local DB
bunx supabase db reset                         # apply migrations + seed data
cd packages/db && bun run db:generate          # generate Prisma client
bun dev                                        # start dev server
```

The local DB runs on `localhost:54322` with seed data including a default wedding (`helen-and-enrique`) and a second test wedding (`e2e-test-wedding`).

---

## Features

### Platform
- Landing page with feature showcase
- Clerk auth (sign-up / sign-in)
- Onboarding wizard (4-step wedding creation)
- Dashboard (my weddings list)
- Platform admin panel (superadmin — manage all weddings)
- 5 theme presets (Warm Gold, Sage Garden, Dusty Rose, Navy Classic, Terracotta)

### Per-Wedding Public Site
- Dynamic content from DB (hero, story, details, schedule, RSVP)
- Photo galleries from DB
- RSVP with plus-ones, multi-event, dietary restrictions, .ics calendar invites
- Gift registry with Stripe payment links
- Hotels with interest tracking
- Things to do / activities
- Trip planner calendar
- Vendors / service links
- Guest photo sharing via QR code + live slideshow
- Feature toggles (show/hide sections per wedding)
- Dark/light mode, responsive design

### Admin Dashboard (`/{slug}/admin`)
- Guest management with A/B/C tier lists
- Real-time RSVP tracking and bulk email
- Seating chart editor with AI generation
- Event management with per-event RSVPs
- Gift/donation tracking
- Email templates (Resend)
- Wedding todos
- Guest photo moderation + ZIP download
- Settings: general, notifications, branding, theme, features, co-admin management
- Content editor with Tiptap WYSIWYG for story

---

## Automated Emails (Cron Jobs)

Two Vercel Cron Jobs handle automated email sending. Both require a **Vercel Pro** plan and the `CRON_SECRET` environment variable.

### Setup

1. Generate a secret: `openssl rand -hex 32`
2. Add it as `CRON_SECRET` in **Vercel Dashboard → Project → Settings → Environment Variables**
3. Apply migration `047` (or `prisma db push`) to create the `reminder_schedules` and `admin_summary_configs` tables
4. Vercel automatically passes the secret as `Authorization: Bearer <CRON_SECRET>` when invoking cron endpoints

### RSVP Reminder Emails

Sends reminder emails to guests who were invited but haven't RSVP'd, at configurable intervals before the RSVP deadline.

| | |
|---|---|
| **Cron endpoint** | `GET /api/cron/rsvp-reminders` |
| **Schedule** | Daily at 9:00 AM UTC |
| **Template** | `rsvp_reminder` (customizable in admin template editor) |

**How it works:**

1. Admins create reminder schedules via the API (e.g. "10 days before deadline", "3 days before deadline")
2. The cron runs daily, checks each schedule: `rsvpDeadline - daysBeforeDeadline = targetDate`
3. If `targetDate === today` and the schedule hasn't already run today, it finds guests where `numberOfResends > 0` (invited) and `rsvpStatus = pending`
4. Sends the `rsvp_reminder` email template to each guest and updates `guest.reminderCount`

**Admin API:**

```bash
# Create a reminder 10 days before the RSVP deadline
POST /api/admin/reminders
{ "daysBeforeDeadline": 10 }

# Create a final reminder 3 days before
POST /api/admin/reminders
{ "daysBeforeDeadline": 3 }

# List all schedules
GET /api/admin/reminders

# Disable a schedule
PUT /api/admin/reminders
{ "schedules": [{ "id": "...", "isEnabled": false }] }

# Delete a schedule
DELETE /api/admin/reminders
{ "id": "..." }
```

### Admin Summary Emails

Periodic digest emails sent to wedding admins with A-list guest statistics: invited/uninvited counts, RSVP breakdown, and a table of guests who haven't been sent invites yet.

| | |
|---|---|
| **Cron endpoint** | `GET /api/cron/admin-summary` |
| **Schedule** | Mondays at 8:00 AM UTC |
| **Template** | `admin_summary` (customizable in admin template editor) |

**How it works:**

1. Admins enable summaries and set the frequency (e.g. every 7 days)
2. The cron runs weekly, checks each wedding's `AdminSummaryConfig`: has `frequencyDays` elapsed since `lastRunAt`?
3. If yes, queries A-list guests, computes stats, and sends the `admin_summary` email to the wedding's `notificationEmails`

**Admin API:**

```bash
# Enable weekly summaries
PUT /api/admin/admin-summary-config
{ "isEnabled": true, "frequencyDays": 7 }

# Switch to biweekly
PUT /api/admin/admin-summary-config
{ "isEnabled": true, "frequencyDays": 14 }

# Check current config
GET /api/admin/admin-summary-config

# Disable
PUT /api/admin/admin-summary-config
{ "isEnabled": false }
```

### Cron Configuration

Schedules are defined in `apps/web/vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/rsvp-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/admin-summary",  "schedule": "0 8 * * 1" }
  ]
}
```

The cron endpoints can also be triggered manually or from any external scheduler by sending a GET request with the `Authorization: Bearer <CRON_SECRET>` header.

---

## Environment Variables

Validated at build time via `@t3-oss/env-nextjs` in `apps/web/env.ts`.

### Server-side

| Variable | Required | Description |
|----------|----------|-------------|
| `CLERK_SECRET_KEY` | Yes | Clerk authentication |
| `ADMIN_EMAILS` | Yes | Superadmin emails (comma-separated) — access to all weddings + platform admin |
| `RESEND_API_KEY` | No | Email sending |
| `STRIPE_SECRET_KEY` | No | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook verification |
| `OPENAI_API_KEY` | No | AI seating chart generation |
| `UPLOADTHING_TOKEN` | No | File uploads |
| `DEFAULT_WEDDING_SLUG` | No | Fallback for legacy URL redirects (default: `helen-and-enrique`) |
| `RSVP_EMAIL` | No | Fallback notification email (per-wedding config preferred) |
| `CRON_SECRET` | No | Authenticates Vercel Cron Job requests (required for automated emails) |

### Client-side

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `NEXT_PUBLIC_APP_URL` | Base URL for emails and metadata |

### Prisma (`packages/db/.env`)

| Variable | Description |
|----------|-------------|
| `POSTGRES_PRISMA_URL` | Pooled connection (port 6543) |
| `POSTGRES_URL_NON_POOLING` | Direct connection (port 5432) |

---

## Database

### Schema

Prisma schema at `packages/db/prisma/schema.prisma`. Key models:

- **Wedding** — top-level entity with slug, config, theme, feature toggles
- **WeddingAdmin** — per-wedding admin access (owner/editor roles)
- **WeddingContent** — section + JSONB content (hero, story, details, schedule, RSVP)
- **RegistryItem** — per-wedding Stripe payment links
- **Guest**, **Party**, **Event**, **GuestEventInvite** — guest management
- **SeatingChart**, **SeatingTable**, **GuestTableAssignment** — seating
- **Photo**, **GuestPhoto** — photo management
- **Gift** — Stripe donations
- **Hotel**, **Activity**, **ServiceLink**, **Document**, **WeddingTodo** — planning tools
- **ReminderSchedule** — configurable RSVP reminder schedules per wedding
- **AdminSummaryConfig** — admin digest email settings per wedding

All models have `weddingId` FK (NOT NULL) with cascade delete.

### Migrations

Supabase migrations in `supabase/migrations/` (numbered `000_` through `044_`). Key multi-tenancy migrations:

| Migration | What |
|-----------|------|
| 032 | Create `weddings` table |
| 033 | Add `wedding_id` to all tables |
| 039 | Create `wedding_admins` table |
| 040 | Add email/branding/feature columns + `wedding_content` + `registry_items` |
| 041 | Make `wedding_id` NOT NULL |
| 042 | RLS on new tables |
| 043 | Add `theme_id` column |
| 044 | Fix triggers for `wedding_id` NOT NULL |
| 046 | Per-wedding email templates |
| 047 | Reminder schedules + admin summary configs |

### Making schema changes

1. Edit `packages/db/prisma/schema.prisma`
2. Write SQL migration in `supabase/migrations/`
3. Reset local DB: `bunx supabase db reset`
4. Regenerate Prisma client: `cd packages/db && bun run db:generate`

---

## Testing

### Unit tests

```bash
bun run test              # run all (~428 tests)
```

Tests in `apps/web/__tests__/` using `bun:test`. Includes multi-tenancy data isolation tests.

### E2E tests

```bash
bun run test:e2e          # headless Playwright
bun run test:e2e:ui       # Playwright UI mode
bun run test:e2e:headed   # headed browser
```

E2E tests in `apps/web/e2e/` cover:
- Multi-tenancy data isolation (admin sees only own wedding's data)
- RSVP isolation (cross-wedding invite codes rejected)
- Platform admin panel (wedding list, stats, actions)
- Onboarding flow (landing page, sign-up links)
- Admin operations (guests, seating, photos, vendors)
- RSVP flow (code entry, form submission)

Requires `LOCAL_E2E_MODE=true` and `E2E_RESET_SECRET` in `.env.local` for local runs.

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run lint` | Lint with Biome |
| `bun run typecheck` | TypeScript type-check |
| `bun run test` | Unit tests |
| `bun run test:e2e` | E2E tests |
| `bun run knip` | Dead code detection |
| `cd apps/web && bun run env:local` | Switch to local Supabase |
| `cd apps/web && bun run env:prod` | Switch to production DB |

---

## Customization

- **Wedding content:** Admin → Content editor (DB-driven, WYSIWYG)
- **Wedding settings:** Admin → Settings (general, notifications, branding, theme, features)
- **Theme:** 5 presets selectable in admin settings; CSS variables in `packages/ui/src/styles/globals.css`
- **Navigation:** Dynamic per-wedding, filtered by feature toggles

## Adding shadcn/ui Components

```bash
bunx shadcn@latest add button -c apps/web
```

Components go to `packages/ui/src/components/`. Import with:

```tsx
import { Button } from "@workspace/ui/components/button"
```
