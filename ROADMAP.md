# Multi-Tenancy & Feature Roadmap

> Last updated: 2026-03-22

This document outlines the roadmap for the wedding platform — from single-tenant wedding site to a multi-tenant platform anyone can use.

---

## Phase 1: Foundation — Multi-Tenancy Core ✅

### 1.1 Wedding Entity & Data Isolation ✅

- [x] `weddings` table with slug, couple_name, wedding_date, status, etc.
- [x] `wedding_id` FK on all 18 tables with cascade delete + indexes
- [x] Backfill existing data to default wedding (`helen-and-enrique`)
- [x] All Prisma queries scoped by `weddingId` (~54 files)
- [x] `wedding_id` NOT NULL on all tables (migration 041)
- [x] RLS policies on all tables (migrations 029, 042)
- [x] DB triggers updated for wedding_id (migration 044)

### 1.2 Wedding Context & Routing ✅

- [x] `getWeddingId()` / `getWeddingContext()` — cached per-request via React.cache()
- [x] Middleware extracts slug from URL, sets `x-wedding-slug` header
- [x] All pages under `app/[slug]/`
- [x] Legacy paths redirect to `/{DEFAULT_WEDDING_SLUG}/...`
- [x] `useWeddingSlug()` client hook
- [ ] Custom domains per wedding (Vercel domain API)

### 1.3 Admin Roles & Permissions ✅

- [x] `wedding_admins` table with `WeddingAdmin` Prisma model (owner/editor)
- [x] `requireAdmin(weddingId)` replaces inline auth in ~30 API routes
- [x] `ADMIN_EMAILS` env var as superadmin fallback
- [x] Admin check via server-side prop (no client-side env var)
- [x] Invite co-admin flow (Admins tab in settings — invite by email, role management)

### 1.4 Tenant-Scoped Configuration ✅

- [x] Wedding model: contactEmail, notificationEmails, emailFromName/Address, person1/2Name, brandImage, featureToggles, themeId
- [x] `wedding_content` table (section + JSONB) replaces `constants.ts`
- [x] `registry_items` table replaces Stripe env vars
- [x] `getWeddingSettings()` and `getWeddingContentSections()` cached data layer
- [x] Zod schemas for all content section types
- [x] All section components accept content as props
- [x] Navigation driven by per-wedding brand image + feature toggles
- [x] Feature toggle enforcement on 8 public pages
- [x] Per-wedding email from address and notification recipients (~12 files)
- [x] `weddingUrl(slug, path)` for slug-aware email links
- [x] Deprecated files deleted (`constants.ts`, `site-config.ts`, `registry/constants.ts`)
- [x] Migrated env vars removed from `env.ts`

---

## Phase 2: Onboarding & Self-Service ✅

### 2.1 Signup & Wedding Creation ✅

- [x] Landing page at `/` with feature showcase, photos, CTAs
- [x] Clerk auth pages (`/sign-up`, `/sign-in`) → `/dashboard`
- [x] Dashboard — lists user's weddings, "Create New" button
- [x] 4-step onboarding wizard: names → slug → date/venue → confirm
- [x] `createWedding()` seeds wedding + admin + events + content

### 2.2 Theme & Customization ✅

- [x] `themeId` column on weddings (migration 043)
- [x] 5 preset themes: Warm Gold, Sage Garden, Dusty Rose, Navy Classic, Terracotta
- [x] CSS variable injection via `[slug]/layout.tsx`
- [x] Theme picker in admin settings
- [ ] Custom color overrides (beyond presets)
- [ ] Per-wedding logo/monogram upload via UploadThing
- [ ] Font pairing options

### 2.3 Admin Settings & Content Editor ✅

- [x] Settings page: General, Notifications, Branding, Theme, Features, Admins tabs
- [x] Content editor: Hero, Story, Details, Schedule, RSVP tabs
- [x] Feature toggle switches per wedding
- [x] Rich text editor for story content (Tiptap WYSIWYG)
- [x] Co-admin invite and management

---

## Phase 3: Enhanced Guest Experience

### 3.1 Guest Portal

- [ ] Authenticated guest dashboard: RSVP status, events, hotel info, activity interests
- [ ] Allow guests to update contact info and dietary restrictions post-RSVP
- [ ] Guestbook / well-wishes feature

### 3.2 Multi-Language Support (i18n)

- [ ] i18n framework (next-intl or similar)
- [ ] English and Spanish support
- [ ] Per-wedding default language setting
- [ ] Language switcher on public pages

### 3.3 Improved RSVP Flow

> **Mostly shipped.** Plus-ones, multi-event RSVP, .ics calendar invites working.

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
### 4.6 Services & Links Manager ✅

---

## Phase 5: Monetization & Scale

### 5.1 Pricing Tiers

- [ ] Free tier: basic site, limited guests
- [ ] Premium: unlimited guests, custom domain, all features
- [ ] Stripe subscriptions (already integrated)

### 5.2 Platform Admin Panel ✅

- [x] Route: `/platform-admin` — protected by superadmin check
- [x] Wedding list with couple, slug, date, status, guests, admins, created
- [x] Stats: total weddings, published/draft/archived, total guests, RSVPs
- [x] Per-wedding actions: publish, archive, draft, delete
- [x] "View Admin" link to jump into any wedding's admin
- [ ] User management — list all Clerk users, see their weddings
- [ ] Feature flag overrides per wedding (grant premium features)
- [ ] Audit log — track admin actions

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

## Multi-Tenancy Status: COMPLETE ✅

The core multi-tenancy infrastructure is **done**. Any couple can sign up, create a wedding, and have a fully isolated site with their own content, theme, guests, events, and registry.

### Remaining hardening (not blocking launch)

| Item | Status | Notes |
|------|--------|-------|
| Stripe webhook wedding resolution | Partial | `resolveGiftWeddingId()` uses guest match or default; needs Stripe metadata on Payment Links |
| Custom domains | Not started | Vercel domain API — nice-to-have for premium tier |

### Testing coverage

- **Unit tests**: 371 tests covering query scoping, auth, RSVP, email, gifts, seating, photos, guest session, data isolation
- **E2E tests** (Playwright):
  - `multi-tenancy.spec.ts` — admin data isolation, public page isolation, invalid slug 404, theme injection
  - `platform-admin.spec.ts` — wedding list, stats, view admin links, status badges
  - `rsvp-isolation.noauth.spec.ts` — cross-wedding invite code rejection
  - `onboarding.noauth.spec.ts` — landing page, CTAs, dashboard auth redirect
  - Plus existing E2E suites for RSVP flow, admin guests, seating, vendors, photos, registry
- **Seed**: Two weddings seeded for isolation testing (`helen-and-enrique` + `e2e-test-wedding`)

---

## Post-Deploy: Environment Variable Cleanup

### Safe to delete from Vercel / GitHub Actions

| Env Var | Replaced By |
|---------|-------------|
| `NEXT_PUBLIC_ADMIN_EMAILS` | `wedding_admins` table + `requireAdmin()` |
| `NEXT_PUBLIC_RSVP_EMAIL` | `weddings.contact_email` |
| `NEXT_PUBLIC_STRIPE_LINK_BABY_FUND` | `registry_items.stripe_url` |
| `NEXT_PUBLIC_STRIPE_LINK_HONEYMOON` | `registry_items.stripe_url` |
| `NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS` | `registry_items.stripe_url` |

### Keep for now (fallbacks)

| Env Var | Why |
|---------|-----|
| `ADMIN_EMAILS` | Superadmin access to all weddings + platform admin |
| `RSVP_EMAIL` | Fallback for Stripe webhook when no wedding resolved |
| `STRIPE_PRODUCT_*` (3) | Fallback product-ID matching for legacy charges |
| `DEFAULT_WEDDING_SLUG` | Legacy URL redirects + webhook fallback |

### Keep forever (platform secrets)

| Env Var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `CLERK_SECRET_KEY` | Clerk auth |
| `NEXT_PUBLIC_APP_URL` | Base URL for emails/metadata |
| `RESEND_API_KEY` | Email sending |
| `STRIPE_SECRET_KEY` | Payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `OPENAI_API_KEY` | AI features |
| `UPLOADTHING_TOKEN` | File uploads |

### Delete later (once legacy charges are gone)

- `STRIPE_PRODUCT_BABY_FUND`, `STRIPE_PRODUCT_HONEYMOON`, `STRIPE_PRODUCT_STUDENT_LOANS`
- `RSVP_EMAIL`
