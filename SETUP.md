# Self-Hosting Guide

How to fork this project and run your own wedding website.

---

## Prerequisites

- [Bun](https://bun.sh) v1.3+ (this project does **not** use npm/yarn)
- [Node.js](https://nodejs.org) v20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development and migrations)
- A [Vercel](https://vercel.com) account (recommended for deployment)

---

## 1. Clone & Install

```bash
git clone <your-fork-url>
cd wedding-website
bun install
```

---

## 2. Set Up External Services

You'll need accounts with the following services. All have free tiers that are more than enough for a wedding site.

### 2.1 Supabase (Database)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database** and copy your connection string
3. Run the migrations to set up your schema:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
4. Note your `DATABASE_URL` (the connection string with port `5432`) and `POSTGRES_URL` (the connection pooler string with port `6543`)

### 2.2 Clerk (Authentication)

1. Create an application at [clerk.com](https://clerk.com)
2. Go to **API Keys** and copy:
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### 2.3 Resend (Email)

1. Create an account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Copy your `RESEND_API_KEY`
4. Create the following email templates (or modify the code to use inline HTML):
   - `wedding-invitation` — sent to guests with their RSVP link
   - `rsvp-notification` — sent to admins when a guest RSVPs
   - `gift-notification` — sent to admins when a gift is received
   - `hotel-interest-notification` — sent to admins when a guest expresses hotel interest

### 2.4 Stripe (Gift Registry / Payments)

1. Create an account at [stripe.com](https://stripe.com)
2. Create 3 products for your gift categories (e.g., honeymoon fund, baby fund, etc.)
3. Create a payment link for each product
4. Copy:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (create a webhook endpoint pointing to `/api/webhooks/stripe`)
   - Product IDs: `STRIPE_PRODUCT_BABY_FUND`, `STRIPE_PRODUCT_HONEYMOON`, `STRIPE_PRODUCT_STUDENT_LOANS`
   - Payment link URLs for the `NEXT_PUBLIC_STRIPE_LINK_*` variables

### 2.5 UploadThing (Photo Uploads)

1. Create an app at [uploadthing.com](https://uploadthing.com)
2. Copy your `UPLOADTHING_TOKEN`

### 2.6 OpenAI (Optional — Seating Chart AI)

1. Get an API key at [platform.openai.com](https://platform.openai.com)
2. Copy your `OPENAI_API_KEY`
3. This is only used for AI-powered seating chart suggestions — skip if you don't need it

---

## 3. Environment Variables

Create `apps/web/.env` with the following:

```env
# --- Database (Supabase) ---
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
POSTGRES_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"

# --- Authentication (Clerk) ---
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# --- Email (Resend) ---
RESEND_API_KEY="re_..."
RSVP_EMAIL="you@example.com,partner@example.com"
NEXT_PUBLIC_RSVP_EMAIL="you@example.com"

# --- Admin Access ---
ADMIN_EMAILS="you@example.com,partner@example.com"
NEXT_PUBLIC_ADMIN_EMAILS="you@example.com,partner@example.com"

# --- Payments (Stripe) ---
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRODUCT_BABY_FUND="prod_..."
STRIPE_PRODUCT_HONEYMOON="prod_..."
STRIPE_PRODUCT_STUDENT_LOANS="prod_..."
NEXT_PUBLIC_STRIPE_LINK_BABY_FUND="https://buy.stripe.com/..."
NEXT_PUBLIC_STRIPE_LINK_HONEYMOON="https://buy.stripe.com/..."
NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS="https://buy.stripe.com/..."

# --- File Uploads (UploadThing) ---
UPLOADTHING_TOKEN="..."

# --- AI (Optional) ---
OPENAI_API_KEY="sk-..."

# --- App ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 4. Customize Your Wedding Details

Edit `apps/web/app/site-config.ts` with your names, date, and RSVP deadline:

```ts
export const SITE_CONFIG = {
  email: env.NEXT_PUBLIC_RSVP_EMAIL,
  weddingDate: "2026-07-30",        // ← your date (YYYY-MM-DD)
  rsvpDeadline: "March 30th, 2026", // ← your deadline
  couple: {
    name: "Helen & Enrique",        // ← your names
    firstNames: {
      person1: "Helen",
      person2: "Enrique",
    },
  },
}
```

Edit `apps/web/app/constants.ts` to update:

- Hero photos (replace images in `public/our-photos/`)
- Your story content
- Ceremony and reception venue details
- Event schedule
- RSVP form configuration

Edit `apps/web/app/registry/constants.ts` to update your gift registry categories.

---

## 5. Run Locally

```bash
# Start Supabase locally (optional, for local DB)
supabase start

# Start the dev server
bun run dev
```

The site will be available at `http://localhost:3000`.

---

## 6. Deploy to Vercel

1. Push your fork to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Set the **Root Directory** to `apps/web`
4. Add all environment variables from step 3 (swap `NEXT_PUBLIC_APP_URL` for your production URL)
5. Connect the Supabase integration (or set `POSTGRES_URL` manually)
6. Deploy

### Stripe Webhook

After deploying, create a webhook in Stripe pointing to:

```
https://your-domain.com/api/webhooks/stripe
```

Listen for `checkout.session.completed` events and update `STRIPE_WEBHOOK_SECRET` with the new signing secret.

---

## 7. Ongoing Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run lint         # Check linting (Biome)
bun run lint:fix     # Auto-fix lint issues
bun run typecheck    # TypeScript checks
bun run test         # Unit tests (Bun)
bun run test:e2e     # E2E tests (Playwright)
```

---

## Architecture Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Supabase (PostgreSQL) + Prisma ORM |
| Auth | Clerk |
| Email | Resend (template-based) |
| Payments | Stripe |
| Uploads | UploadThing |
| Linting | Biome |
| Monorepo | Turborepo |
| Package Manager | Bun |
