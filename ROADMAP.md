# Multi-Tenancy & Feature Roadmap

> Last updated: 2026-03-19

This document outlines the roadmap for evolving this wedding website from a single-tenant application into a multi-tenant platform that other couples can use.

---

## Phase 1: Foundation — Multi-Tenancy Core

The biggest architectural change. Every table currently stores data globally; this phase scopes all data to a `wedding` entity.

### 1.1 Wedding Entity & Data Isolation

> **Partially shipped (2026-03-18).** Schema + types done. Query updates and RLS policies remain.

- [x] Create a `weddings` table as the top-level entity
  - Fields: `id`, `slug` (URL-friendly identifier), `couple_name`, `wedding_date`, `rsvp_deadline`, `timezone`, `status` (draft/published/archived), `created_at`, `updated_at`
  - Seeded with default wedding row for Helen & Enrique (`slug: helen-and-enrique`)
- [x] Add nullable `wedding_id` foreign key to all 15 existing tables (`guests`, `parties`, `events`, `activities`, `photos`, `gifts`, `seating_charts`, `hotels`, `wedding_todos`, etc.)
- [x] Write a migration to backfill existing data with the default `wedding_id`
- [x] Update Kysely types (`WeddingsTable`, `wedding_id` on all interfaces)
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

> **In progress.** Plus-one name collection already exists. Remaining items below.

- [ ] Multi-event RSVP in a single form (currently requires separate flows)
- [ ] Meal selection during RSVP (if applicable)
- [ ] Song request field
- [x] Plus-one name collection during RSVP
- [ ] RSVP confirmation page with calendar invite download (.ics)

### 3.4 Photo Sharing

> **Shipped.** Guests upload via QR code → `/photos/upload`, photos display immediately on `/slideshow`, admins moderate at `/admin/photos/guest` with ZIP download. See README for details.

---

## Phase 4: Admin Power Features

Advanced tools for wedding organizers.

### 4.0 Physical Mail

Send real-world letters and postcards to guests directly from the admin dashboard — thank you notes, save-the-dates, or custom announcements.

**Recommended API: [Lob](https://lob.com)**
- REST API for letters and postcards (print + postage handled by Lob)
- ~$0.89/letter, ~$0.77/postcard (free developer tier, no monthly fee)
- Built-in address verification
- Merge variables for personalization (guest name, table number, etc.)

**Alternatives**
- **PostGrid** — drag-and-drop template editor + API, supports QR codes and personalized URLs per mailpiece (~$0.82/postcard)
- **ClickSend** — no minimums, simple setup, Zapier integration
- **Print.one** — postcard/greeting-card focus, no subscription

**Proposed implementation**
- [ ] Add mailing address fields to the guest record (`address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`)
- [ ] Build an address collection flow: optional field on RSVP form, or admin bulk-import via CSV
- [ ] Create a "Physical Mail" section in the admin dashboard
  - Select recipient segment (all guests, attending only, specific party, individual)
  - Choose mail type (letter or postcard)
  - Choose or upload a template with merge variables (`{{guest_name}}`, `{{couple_name}}`, etc.)
  - Preview before sending
- [ ] Server Action: pulls guest + address data from Supabase, calls Lob API, stores `lob_letter_id` and delivery status back on the guest record
- [ ] Track delivery status via Lob webhooks → update guest record with `mail_status` (created / in_transit / delivered / returned)
- [ ] (Optional) Trigger automatically: after RSVP confirmed, queue a thank-you letter via a Supabase Edge Function

**Thank you letter use case (MVP)**
1. Admin clicks "Send thank you letters" after the wedding
2. App filters guests with `rsvp_status = attending` and a valid mailing address
3. Single Lob API call per guest with a shared letter template + personalized merge vars
4. Status tracked per guest; admin sees a delivery dashboard

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

### 4.5 Document Center

A central place for couples to upload, organize, and share important wedding-related documents (contracts, receipts, floor plans, timelines, etc.).

- [ ] Create a `documents` table (`id`, `wedding_id`, `title`, `description`, `file_url`, `file_type`, `file_size`, `category`, `uploaded_by`, `created_at`, `updated_at`)
- [ ] Define document categories (contract, receipt, floor_plan, timeline, other)
- [ ] Build upload UI in admin dashboard with drag-and-drop support (UploadThing or Supabase Storage)
- [ ] List view with filtering by category and search by title
- [ ] Preview support for PDFs and images inline
- [ ] Download individual files or bulk-download as ZIP
- [ ] Optional: share specific documents with co-admins or vendors via expiring links

### 4.6 Services & Links Manager

A CRUD interface for couples to manually add, edit, and remove links in the services/vendors section — florists, photographers, venues, etc. — with optional descriptions.

- [ ] Create a `service_links` table (`id`, `wedding_id`, `title`, `url`, `description` (nullable), `category` (nullable), `sort_order`, `created_at`, `updated_at`)
- [ ] Admin CRUD UI: add, edit, reorder, and delete service links
- [ ] Support optional description (short text) displayed alongside each link
- [ ] Optional category grouping (venue, catering, photography, music, flowers, other)
- [ ] Drag-and-drop reordering via `sort_order`
- [ ] Render links on the public-facing services/vendors page, grouped by category
- [ ] Validate URLs on save and show favicon or open-graph preview where available

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

| Priority | Phase | Status | Rationale |
|----------|-------|--------|-----------|
| 1 | 1.1 Wedding Entity | **Partially shipped** (schema + types; queries + RLS pending) | Everything depends on this data model change |
| 2 | 3.3 Improved RSVP | **In progress** (song request, meal selection, confirmation + .ics) | RSVP deadline March 30 — ship before guests respond |
| 3 | 4.1 Analytics | Not started | High-value as RSVPs come in |
| 4 | 1.1 Query + RLS | Not started | Complete the multi-tenancy foundation |
| 5 | 1.2 Scoped Routing | Not started | Can't serve multiple weddings without this |
| 6 | 1.3 Admin Roles | Not started | Need per-wedding access control before onboarding others |
| 7 | 1.4 Tenant Config | Not started | Remove hardcoded wedding-specific content |
| 8 | 2.1 Signup Flow | Not started | First external couple can now sign up |
| 9 | 2.2 Themes | Not started | Visual differentiation between weddings |
| 10 | 5.1 Pricing | Not started | Monetize once there's proven value |
| — | ~~3.4 Photo Sharing~~ | **Shipped** | — |

---

## Migration Strategy

To avoid breaking the existing live wedding site during the transition:

1. **Feature-flag the multi-tenant code path** — existing site continues to work as-is
2. **Add `wedding_id` columns as nullable first**, backfill, then make non-null
3. **Deploy routing changes behind a flag** — old routes redirect to new `[slug]` routes
4. **Keep the existing Clerk + email admin auth working** until per-wedding roles are ready
5. **Run both old and new admin UIs in parallel** during transition
