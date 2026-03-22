# Multi-Tenancy & Feature Roadmap

> Last updated: 2026-03-22

This document outlines the roadmap for evolving this wedding website from a single-tenant application into a multi-tenant platform that anyone can use to plan their wedding.

---

## Phase 1: Foundation — Multi-Tenancy Core ✅

### 1.1 Wedding Entity & Data Isolation ✅

- [x] Create `weddings` table with slug, couple_name, wedding_date, status, etc.
- [x] Add `wedding_id` FK to all 18 tables with cascade delete + indexes
- [x] Backfill existing data to default wedding (`helen-and-enrique`)
- [x] Scope all Prisma queries by `weddingId` (~54 files)
- [ ] Add Supabase RLS policies scoped to `wedding_id` (defense-in-depth)
- [ ] Migration to make `wedding_id` columns NOT NULL

### 1.2 Wedding Context & Routing ✅

- [x] `getWeddingId()` / `getWeddingContext()` — cached per-request via React.cache()
- [x] Middleware extracts slug from URL, sets `x-wedding-slug` header
- [x] All pages moved under `app/[slug]/` (e.g., `/helen-and-enrique/rsvp`)
- [x] Legacy paths (`/admin`, `/rsvp`) redirect to `/{DEFAULT_WEDDING_SLUG}/...`
- [x] `useWeddingSlug()` client hook for client components
- [ ] Support custom domains per wedding (optional, via Vercel's domain API)

### 1.3 Admin Roles & Permissions ✅

- [x] `wedding_admins` table with `WeddingAdmin` Prisma model (owner/editor roles)
- [x] `requireAdmin(weddingId)` helper replaces inline auth in ~30 API routes
- [x] `ADMIN_EMAILS` env var kept as superadmin fallback
- [x] Admin check moved from client-side env var to server-side prop
- [ ] "Invite co-admin" flow (email invite → creates WeddingAdmin row)

### 1.4 Tenant-Scoped Configuration ✅

- [x] Wedding model extended: contactEmail, notificationEmails, emailFromName, emailFromAddress, person1/2Name, brandImage, featureToggles (JSONB)
- [x] `wedding_content` table (section + JSONB) replaces hardcoded `constants.ts`
- [x] `registry_items` table replaces hardcoded Stripe env vars
- [x] `getWeddingSettings()` and `getWeddingContentSections()` cached data layer
- [x] Zod schemas for all content section types
- [x] All section components accept content as props (hero, story, details, schedule, RSVP)
- [x] Navigation config driven by per-wedding brand image + feature toggles
- [x] Feature toggle enforcement on 8 public pages (notFound if disabled)
- [x] Per-wedding email from address and notification recipients across 12 files
- [x] `weddingUrl(slug, path)` for slug-aware email links

---

## Phase 2: Onboarding & Self-Service ✅

### 2.1 Signup & Wedding Creation ✅

- [x] Landing/marketing page at `/` with feature showcase, photos, and CTAs
- [x] Clerk auth pages (`/sign-up`, `/sign-in`) with redirect to `/dashboard`
- [x] Dashboard page — lists user's weddings, links to admin, "Create New" button
- [x] 4-step onboarding wizard: names → slug (validated unique) → date/venue → confirm
- [x] `createWedding()` server action seeds wedding + admin + events + content

### 2.2 Theme & Customization

- [ ] Create a `wedding_themes` table or add theme fields to `weddings` (color palette, font pairing, hero layout)
- [ ] Build 3-5 preset themes couples can choose from
- [ ] Allow custom color overrides via admin settings
- [ ] Per-wedding logo/monogram upload

### 2.3 Admin Settings & Content Editor ✅

- [x] Settings page with tabs: General, Notifications, Branding, Features
- [x] Content editor with tabs: Hero, Story, Details, Schedule, RSVP
- [x] Feature toggle switches per wedding
- [x] Server actions with auth checks and upsert for content
- [ ] WYSIWYG or rich text editor for story content (currently plain text)

---

## Phase 3: Enhanced Guest Experience

### 3.1 Guest Portal

- [ ] Authenticated guest dashboard: RSVP status, events, hotel info, activity interests
- [ ] Allow guests to update contact info and dietary restrictions post-RSVP
- [ ] Guestbook / well-wishes feature

### 3.2 Multi-Language Support (i18n)

- [ ] Add i18n framework (next-intl or similar)
- [ ] Support at least English and Spanish
- [ ] Per-wedding default language setting
- [ ] Language switcher on public pages

### 3.3 Improved RSVP Flow

> **Mostly shipped.** Plus-ones, multi-event RSVP, .ics calendar invites all working.

- [x] Plus-one name collection with dietary restrictions, age info
- [x] Multi-event RSVP via `guest_event_invites` table
- [x] RSVP confirmation with .ics calendar invite (single + bulk)
- [ ] Meal selection during RSVP
- [ ] Song request field

### 3.4 Photo Sharing ✅

> **Shipped.** QR code upload, live slideshow, admin moderation, ZIP download.

---

## Phase 4: Admin Power Features

### 4.0 Physical Mail

- [ ] Lob API integration for letters/postcards
- [ ] Address collection/verification flow
- [ ] Delivery tracking via webhooks

### 4.1 Analytics Dashboard

- [ ] RSVP response rate over time (chart)
- [ ] Guest breakdown by side, tier, dietary restrictions
- [ ] Email open/click tracking (Resend)
- [ ] Gift totals and trends

### 4.2 Communication Hub

> **Email portion shipped.** Bulk send, templates, event invites, calendar invites.

- [x] Email blast to guest segments
- [x] Email templates with Resend
- [x] Event-specific invitation emails
- [ ] Email scheduling (future send)
- [ ] SMS/WhatsApp via Twilio
- [ ] Automated reminder emails for non-responders

### 4.3 Budget Tracker

- [ ] Budget categories, vendor payment tracking
- [ ] Gift income tracking (Stripe data exists)
- [ ] Budget vs. actual comparison

### 4.4 Day-of Coordination

- [ ] Check-in mode (tablet-friendly UI)
- [ ] Vendor timeline / run-of-show
- [ ] Emergency contacts list

### 4.5 Document Center ✅

> **Shipped.** CRUD with UploadThing, categories, file metadata.

### 4.6 Services & Links Manager ✅

> **Shipped.** Admin CRUD, guest-facing display, categories, sort order.

---

## Phase 5: Monetization & Scale

### 5.1 Pricing Tiers

- [ ] Free tier: basic site, limited guests
- [ ] Premium: unlimited guests, custom domain, all features
- [ ] Stripe subscriptions (already integrated)

### 5.2 Platform Admin Panel (Super-Admin)

A meta-admin site at `/platform-admin` for managing all weddings on the platform. Only accessible to superadmins (users in `ADMIN_EMAILS` env var).

- [ ] Route: `app/platform-admin/` — protected by superadmin check
- [ ] **Wedding list** — searchable/filterable table of all weddings (slug, couple, date, status, guest count, created)
- [ ] **Wedding detail view** — view any wedding's stats, impersonate/jump into their admin
- [ ] **User management** — list all Clerk users, see which weddings they admin
- [ ] **Usage metrics** — total weddings, active vs draft vs archived, total guests across platform, total RSVPs
- [ ] **Moderation tools** — ability to archive/suspend a wedding, delete spam/abuse
- [ ] **Feature flags** — override feature toggles per wedding (e.g., grant premium features)
- [ ] **Audit log** — track admin actions (wedding created, status changed, etc.)

### 5.3 Infrastructure

- [ ] Rate limiting on public APIs
- [ ] CDN for per-wedding static assets
- [ ] Background job processing for bulk emails
- [ ] Webhook retry queue

---

## Phase 6: Nice-to-Haves

- [ ] Save the Date digital cards
- [ ] FAQ page builder
- [ ] Wedding party page (bridesmaids/groomsmen bios)
- [ ] Maps integration with directions
- [ ] Export tools (guest CSV, seating PDF, gift report)
- [ ] Archive mode (read-only post-wedding)
- [ ] PWA support for offline schedule access
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## What's Next for Multi-Tenancy

The core multi-tenancy infrastructure is **complete**. A second couple can sign up, create a wedding, and have a fully isolated site. Remaining items to harden for production:

| Priority | Item | Status | Notes |
|----------|------|--------|-------|
| 1 | ~~**E2E test with second wedding**~~ | **Done** | Multi-tenancy data isolation tests |
| 2 | ~~**`wedding_id` NOT NULL migration**~~ | **Done** | Migration 041 |
| 3 | ~~**RLS policies**~~ | **Done** | Migration 042 — RLS on all new tables |
| 4 | ~~**Platform admin panel**~~ | **Done** | `/platform-admin` — wedding list, stats, status management, delete |
| 5 | ~~**Invite co-admin flow**~~ | **Done** | Admins tab in settings — invite by email, remove, role management |
| 6 | **Stripe webhook wedding resolution** | Partial | `resolveGiftWeddingId()` uses guest match or default wedding |
| 7 | ~~**Delete deprecated files**~~ | **Done** | `constants.ts`, `site-config.ts`, `registry/constants.ts` deleted |
| 8 | ~~**Remove migrated env vars**~~ | **Done** | Client-side Stripe/RSVP vars removed; server-side kept as fallback |
| 9 | ~~**Theme system**~~ | **Done** | 5 preset themes with CSS variable injection |
| 10 | **Custom domains** | Not started | Vercel domain API |

---

## Post-Deploy: Environment Variable Cleanup

After merging and deploying the multi-tenancy branch, these env vars can be removed from **Vercel** and **GitHub Actions secrets**:

### Safe to delete (fully migrated to DB)

| Env Var | Replaced By |
|---------|-------------|
| `NEXT_PUBLIC_ADMIN_EMAILS` | `wedding_admins` table + `requireAdmin()` |
| `NEXT_PUBLIC_RSVP_EMAIL` | `weddings.contact_email` |
| `NEXT_PUBLIC_STRIPE_LINK_BABY_FUND` | `registry_items.stripe_url` |
| `NEXT_PUBLIC_STRIPE_LINK_HONEYMOON` | `registry_items.stripe_url` |
| `NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS` | `registry_items.stripe_url` |

### Keep for now (used as fallbacks)

| Env Var | Why Keep |
|---------|----------|
| `ADMIN_EMAILS` | Superadmin fallback — grants access to ALL weddings |
| `RSVP_EMAIL` | Fallback notification emails for Stripe webhook when no wedding resolved |
| `STRIPE_PRODUCT_BABY_FUND` | Fallback product-ID matching in webhook for legacy charges |
| `STRIPE_PRODUCT_HONEYMOON` | Same |
| `STRIPE_PRODUCT_STUDENT_LOANS` | Same |
| `DEFAULT_WEDDING_SLUG` | Backward compat — legacy URL redirects + webhook fallback |

### Keep forever (platform-level secrets)

| Env Var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `CLERK_SECRET_KEY` | Clerk auth |
| `NEXT_PUBLIC_APP_URL` | Base URL for emails and metadata |
| `RESEND_API_KEY` | Email sending |
| `STRIPE_SECRET_KEY` | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `OPENAI_API_KEY` | AI features (seating chart generation) |
| `UPLOADTHING_TOKEN` | File uploads |

### Can delete later (once all Stripe charges have weddingId)

Once all registry items have `stripe_product_id` set in the DB and no legacy charges remain without `weddingId`:
- `STRIPE_PRODUCT_BABY_FUND`
- `STRIPE_PRODUCT_HONEYMOON`
- `STRIPE_PRODUCT_STUDENT_LOANS`
- `RSVP_EMAIL`

---

## Migration Strategy

1. ~~Add `wedding_id` columns as nullable, backfill~~ ✅ Done
2. ~~Scope all queries by `wedding_id`~~ ✅ Done (Prisma)
3. ~~Slug-based routing with middleware~~ ✅ Done
4. ~~Per-wedding admin auth~~ ✅ Done (`requireAdmin`)
5. ~~DB-driven content, email, registry~~ ✅ Done
6. ~~Onboarding wizard + dashboard~~ ✅ Done
7. **Next:** NOT NULL migration → RLS policies → themes → custom domains
