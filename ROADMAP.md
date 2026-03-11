# Multi-Tenancy & Feature Roadmap

> Last updated: 2026-03-11

This document outlines the roadmap for evolving this wedding website from a single-tenant application into a multi-tenant platform that other couples can use.

---

## Phase 1: Foundation — Multi-Tenancy Core

The biggest architectural change. Every table currently stores data globally; this phase scopes all data to a `wedding` entity.

### 1.1 Wedding Entity & Data Isolation

- [ ] Create a `weddings` table as the top-level entity
  - Fields: `id`, `slug` (URL-friendly identifier), `couple_name`, `wedding_date`, `rsvp_deadline`, `timezone`, `status` (draft/published/archived), `created_at`, `updated_at`
- [ ] Add `wedding_id` foreign key to all 14 existing tables (`guests`, `parties`, `events`, `activities`, `photos`, `gifts`, `seating_charts`, `hotels`, `wedding_todos`, etc.)
- [ ] Write a migration to backfill existing data with a default `wedding_id`
- [ ] Update all Kysely queries to filter by `wedding_id` (this touches nearly every query in the app)
- [ ] Add Supabase Row-Level Security (RLS) policies scoped to `wedding_id`

### 1.2 Wedding-Scoped Routing

- [ ] Move public pages under a dynamic route: `app/[slug]/` (e.g., `/helen-and-enrique/rsvp`)
- [ ] Move admin pages under: `app/[slug]/admin/`
- [ ] Add middleware to resolve `slug` → `wedding_id` and inject into request context
- [ ] Support custom domains per wedding (optional, via Vercel's domain API)

### 1.3 Admin Roles & Permissions

- [ ] Create a `wedding_admins` table (`wedding_id`, `clerk_user_id`, `role`: owner/editor/viewer)
- [ ] Replace the `ADMIN_EMAILS` environment variable with per-wedding admin assignments
- [ ] Update `admin.ts` auth to check wedding-scoped admin access
- [ ] Add an "invite co-admin" flow so couples can share admin access

### 1.4 Tenant-Scoped Configuration

- [ ] Move hardcoded values from `site-config.ts` and `constants.ts` into the `weddings` table or a `wedding_settings` table
  - Couple names, wedding date, RSVP deadline, ceremony/reception details, schedule, story content
- [ ] Create an admin settings page for couples to configure their wedding details
- [ ] Move static photos (`/our-photos/*`) to per-wedding storage (UploadThing or Supabase Storage)

---

## Phase 2: Onboarding & Self-Service

Make it possible for new couples to sign up and create their own wedding site without your intervention.

### 2.1 Signup & Wedding Creation

- [ ] Create a landing/marketing page at `/` explaining the platform
- [ ] Build a signup flow: Clerk auth → create wedding → choose slug → redirect to admin setup wizard
- [ ] Setup wizard: couple names, wedding date, venue details, timezone, RSVP deadline
- [ ] Generate a starter set of data (default events for ceremony + reception)

### 2.2 Theme & Customization

- [ ] Create a `wedding_themes` table or add theme fields to `weddings` (color palette, font pairing, hero layout)
- [ ] Build 3-5 preset themes couples can choose from
- [ ] Allow custom color overrides via admin settings
- [ ] Per-wedding logo/monogram upload

### 2.3 Template Pages

- [ ] Make the home page sections (hero, story, details, schedule, RSVP CTA) configurable
- [ ] Allow couples to toggle sections on/off
- [ ] WYSIWYG or structured editor for story content
- [ ] Custom navigation links (e.g., add/remove Hotels, Things to Do pages)

---

## Phase 3: Enhanced Guest Experience

Features that improve the guest-facing experience across all weddings.

### 3.1 Guest Portal

- [ ] Authenticated guest dashboard showing: their RSVP status, events they're invited to, hotel info, activity interests
- [ ] Allow guests to update their own contact info and dietary restrictions post-RSVP
- [ ] Guest-to-guest messaging or guestbook/well-wishes feature

### 3.2 Multi-Language Support (i18n)

- [ ] Add i18n framework (next-intl or similar)
- [ ] Support at least English and Spanish (given the couple's background, this is natural)
- [ ] Per-wedding default language setting
- [ ] Language switcher on public pages

### 3.3 Improved RSVP Flow

- [ ] Multi-event RSVP in a single form (currently requires separate flows)
- [ ] Meal selection during RSVP (if applicable)
- [ ] Song request field
- [ ] Plus-one name collection during RSVP
- [ ] RSVP confirmation page with calendar invite download (.ics)

### 3.4 Photo Sharing

- [ ] Guest photo uploads (during/after the wedding)
- [ ] Photo gallery with moderation queue for admin approval
- [ ] QR code generation for easy upload at the event
- [ ] Integration with shared albums (Google Photos, iCloud)

---

## Phase 4: Admin Power Features

Advanced tools for wedding organizers.

### 4.1 Analytics Dashboard

- [ ] RSVP response rate over time (chart)
- [ ] Guest list breakdown by side, list tier, dietary restrictions
- [ ] Email open/click tracking (Resend supports this)
- [ ] Gift totals and trends

### 4.2 Communication Hub

- [ ] Email blast to guest segments (all, attending, not responded, by event)
- [ ] Email scheduling (send at a future date)
- [ ] SMS/WhatsApp notifications via Twilio (guests already have phone/WhatsApp fields)
- [ ] Automated reminder emails for non-responders

### 4.3 Budget Tracker

- [ ] Budget categories (venue, catering, photography, etc.)
- [ ] Vendor management with contact info and payment tracking
- [ ] Gift income tracking (already have Stripe data)
- [ ] Budget vs. actual comparison

### 4.4 Day-of Coordination Tools

- [ ] Check-in mode: mark guests as arrived (tablet-friendly UI)
- [ ] Vendor timeline/run-of-show view
- [ ] Emergency contacts list
- [ ] Real-time seating availability

---

## Phase 5: Monetization & Scale

If you want to turn this into a product.

### 5.1 Pricing Tiers

- [ ] **Free tier**: Basic site with limited guests (e.g., 50), 1 admin, standard themes
- [ ] **Premium tier**: Unlimited guests, custom domain, all themes, photo sharing, analytics
- [ ] **Pro tier**: White-label, priority support, advanced integrations
- [ ] Implement with Stripe subscriptions (you already have Stripe integrated)

### 5.2 Platform Admin Panel

- [ ] Super-admin dashboard to manage all weddings on the platform
- [ ] Usage metrics, active weddings, revenue tracking
- [ ] Abuse/spam monitoring
- [ ] Feature flag management per wedding/tier

### 5.3 Infrastructure for Scale

- [ ] Database connection pooling (Supabase already provides this via PgBouncer)
- [ ] CDN for per-wedding static assets
- [ ] Rate limiting on public APIs
- [ ] Webhook retry queue for Stripe events
- [ ] Background job processing for bulk emails

---

## Phase 6: Nice-to-Haves

Lower priority features that add polish.

- [ ] **Save the Date** digital cards with shareable links
- [ ] **Travel page** with flight/airport info and group travel coordination
- [ ] **FAQ page** builder for common guest questions
- [ ] **Countdown widget** embeddable on external sites
- [ ] **Wedding party page** showcasing bridesmaids/groomsmen with photos and bios
- [ ] **Maps integration** with directions between venues, hotels, and activities
- [ ] **Accessibility audit** ensuring WCAG 2.1 AA compliance across all themes
- [ ] **PWA support** for offline access to schedule and venue details
- [ ] **Export tools** — guest list CSV, seating chart PDF, gift summary report
- [ ] **Archive mode** — read-only site after the wedding with photos and memories

---

## Implementation Priority

If working toward multi-tenancy as the primary goal, the recommended order is:

| Priority | Phase | Rationale |
|----------|-------|-----------|
| 1 | 1.1 Wedding Entity | Everything depends on this data model change |
| 2 | 1.2 Scoped Routing | Can't serve multiple weddings without this |
| 3 | 1.3 Admin Roles | Need per-wedding access control before onboarding others |
| 4 | 1.4 Tenant Config | Remove hardcoded wedding-specific content |
| 5 | 2.1 Signup Flow | First external couple can now sign up |
| 6 | 3.3 Improved RSVP | High-value guest experience improvement |
| 7 | 2.2 Themes | Visual differentiation between weddings |
| 8 | 4.1 Analytics | Compelling value-add for admins |
| 9 | 3.4 Photo Sharing | Frequently requested wedding feature |
| 10 | 5.1 Pricing | Monetize once there's proven value |

---

## Migration Strategy

To avoid breaking the existing live wedding site during the transition:

1. **Feature-flag the multi-tenant code path** — existing site continues to work as-is
2. **Add `wedding_id` columns as nullable first**, backfill, then make non-null
3. **Deploy routing changes behind a flag** — old routes redirect to new `[slug]` routes
4. **Keep the existing Clerk + email admin auth working** until per-wedding roles are ready
5. **Run both old and new admin UIs in parallel** during transition
