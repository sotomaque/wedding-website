# WedPlan — Product & Acquisition Roadmap

> Last updated: 2026-03-25

---

## Current State

Multi-tenant wedding platform with: Clerk auth, Stripe payments, AI seating charts, per-wedding email templates (DB-stored), address autocomplete (Geoapify), Vercel cron jobs (RSVP reminders + admin summaries), full E2E test coverage, and a security-hardened API layer (weddingId-scoped queries on all 37 routes).

| Asset | Status |
|-------|--------|
| Multi-tenancy | Full (weddingId-scoped queries, RLS, cross-tenant security audit complete) |
| AI features | Seating chart generation (OpenAI) |
| Payments | Stripe (registry + gifting) |
| Email system | Per-wedding DB templates, toggleable, cron-based reminders + admin summaries |
| Vendor management | ServiceLinks + vendors page |
| E2E tests | 427 unit + Playwright E2E (parallel read-only, serial mutating) |
| Platform admin | Superadmin panel |
| Mobile | Web-only (Next.js) — gap vs Zola/Joy native apps |

---

## Phase 1: Foundation ✅ COMPLETE

### 1.1 Multi-Tenancy Core ✅
- [x] `weddings` table with slug, couple_name, wedding_date, status
- [x] `wedding_id` FK on all tables with cascade delete + indexes
- [x] All Prisma queries scoped by `weddingId` (~54 files)
- [x] RLS policies on all tables
- [x] Cross-tenant security audit (20 API routes hardened)

### 1.2 Wedding Context & Routing ✅
- [x] `getWeddingId()` / `getWeddingContext()` cached per-request
- [x] Middleware extracts slug, sets headers
- [x] All pages under `app/[slug]/`
- [x] `useWeddingSlug()` client hook
- [x] All admin links use slug prefix (6 files fixed in audit)

### 1.3 Admin Roles & Permissions ✅
- [x] `wedding_admins` table (owner/editor roles)
- [x] `requireAdmin(weddingId)` on all admin API routes
- [x] Co-admin invite flow

### 1.4 Tenant-Scoped Configuration ✅
- [x] Per-wedding email templates (DB-stored, toggleable via `isActive`)
- [x] Per-wedding themes (5 presets with CSS variable injection)
- [x] Feature toggles, brand image, notification recipients
- [x] Content editor (Hero, Story, Details, Schedule, RSVP)

---

## Phase 2: Onboarding & Self-Service ✅ COMPLETE

- [x] Landing page with feature showcase
- [x] Clerk auth → Dashboard → 4-step onboarding wizard
- [x] Wedding creation seeds: admin, events, content, email templates
- [x] Theme picker, content editor, feature toggles
- [x] Address autocomplete (Geoapify) on all address inputs
- [x] Shadcn calendar date pickers on all date fields

---

## Phase 3: AI Features (Months 1–2)

> Build the technical moat. These directly compete with The Knot's AI push.

### Tier 1 — Quick Wins (Weeks 1–4)

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI Todo Generator** | Low | High | On onboarding, GPT generates date-aware checklist → `WeddingTodo` table. First "wow" moment. |
| **AI Story Writer** | Low | High | "Generate with AI" button in content editor. Couple gives a few sentences → GPT drafts full story → populates Tiptap editor. |
| **AI Guest Email Drafts** | Low | High | "AI Draft" button in template editor. Describe intent → GPT generates email HTML. |
| **AI Photo Captions** | Low | Medium | GPT-4 Vision on uploaded guest photos → auto-caption. Add `caption` column to `GuestPhoto`. |

### Tier 2 — Mid-Term (Weeks 4–8)

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI RSVP Insights** | Medium | High | Natural language dashboard insights from existing RSVP/dietary/hotel data. No schema changes. |
| **AI Seating Chart v2** | Medium | High | Natural language constraints ("keep divorced parents apart"). Improved prompt, not new infra. |
| **AI Budget Optimizer** | Medium | High | Couple enters budget → AI allocates by category based on guest count, venue, location. New `Budget` model. |
| **AI Vendor Recommendations** | Medium | Medium | Based on theme, budget, location → suggest vendor categories and styles. |

### Tier 3 — Strategic (Months 2–4)

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI Planning Assistant (Chat)** | High | Very High | Persistent sidebar chat with live DB context via OpenAI function calling. This is The Knot's ChatGPT app — but better because it has real data. |
| **AI Timeline Generator** | High | High | Minute-by-minute wedding day timeline → PDF export. Replaces $2K–$5K day-of coordinator. |
| **AI Style Advisor** | High | High | Upload inspiration images → GPT-4 Vision recommends theme preset + custom color overrides. |

### Architecture Note
All AI features must pass `weddingId` and scope system prompts to wedding data. Share a single `lib/ai/client.ts` utility that wraps `getWeddingId() + requireAdmin()`. Don't let AI become a multi-tenancy leak vector.

---

## Phase 4: Traction & Revenue (Months 2–3)

### 4.1 Real Weddings
- [ ] Onboard 25–50 real weddings (bridal expos, SD wedding Facebook groups, Instagram ads)
- [ ] 3–5 case studies with video testimonials
- [ ] Live slideshow showcase at a real wedding

### 4.2 Paid Tier
- [ ] Free tier: basic site, limited guests
- [ ] Premium ($29–49/mo): unlimited guests, custom domain, AI features, all email templates
- [ ] Stripe subscriptions (already integrated)
- [ ] Feature flag overrides per wedding in platform admin

### 4.3 Vendor Marketplace (Lightweight)
- [ ] Vendor directory: vendors can claim/create profiles
- [ ] Lead gen: couples express interest → vendor gets notified
- [ ] "For Vendors" landing page
- [ ] Target 20+ local SD vendors (photographers, florists, venues)
- [ ] This is The Knot's core revenue model — even a lightweight version signals market understanding

### 4.4 Custom Registries
- [ ] Amazon-style wish lists with gift claiming (planned, schema designed)
- [ ] Guests claim gifts to prevent duplicates (optimistic locking)
- [ ] External registry links (Amazon, Target, etc.)
- [ ] URL metadata scraping for auto-fill (metascraper)

---

## Phase 5: Positioning & Packaging (Months 3–4)

### 5.1 Brand
- [ ] Register `wedplan.app` or `wedplan.co`
- [ ] Keep `helen-and-enrique.com` as showcase/demo wedding
- [ ] Standalone marketing site

### 5.2 Growth
- [ ] Waitlist (target 500+ signups)
- [ ] Product Hunt launch
- [ ] Press angle: "Former couple builds multi-tenant wedding platform with AI seating charts"

### 5.3 Technical Due Diligence Package
- [ ] Architecture overview doc (schema, multi-tenancy, auth, payments)
- [ ] Test coverage report (427 unit + E2E)
- [ ] Security audit summary (cross-tenant hardening, RLS, weddingId scoping)
- [ ] CI/CD pipeline overview (Vercel, GitHub Actions, preview deployments)

---

## Phase 6: Outreach & Exit (Months 4–6)

### 6.1 Target Buyers

| Buyer | Why |
|-------|-----|
| **The Knot Worldwide** | New CEO + CFO doubling down on AI. Actively acquiring AI capabilities. Your stack is more modern than their likely legacy codebase. |
| **Zola** | $140M+ raised, product-led, acqui-hire friendly |
| **Joy** | Bootstrapped, strong UX, would value guest management + seating AI |
| **PE firms** | Wedding SaaS market growing 12% CAGR ($2.5B → $6.8B by 2033) |

### 6.2 Outreach Strategy
- [ ] Map 2nd-degree LinkedIn connections to The Knot corp dev team
- [ ] Target The Knot's BD/Corp Dev (dedicated M&A function)
- [ ] Present at Wedding MBA (November) or YC Demo Day
- [ ] Engage boutique M&A advisor ($1M–$10M SaaS range)

### 6.3 Valuation Framework

| Stage | Range |
|-------|-------|
| Acqui-hire (team + IP) | $500K–$2M |
| Product acquisition ($1K–5K MRR, 50 weddings, vendor marketplace) | $2M–$8M |
| Strategic acquisition ($10K+ MRR, two-sided marketplace) | $10M+ at 5–10x ARR |

---

## Remaining Technical Gaps

| Gap | Priority | Notes |
|-----|----------|-------|
| Mobile (PWA or React Native) | High | Web-only is a risk vs Zola/Joy native apps |
| Custom domains per wedding | Medium | Vercel domain API — premium tier feature |
| Rate limiting on public APIs | Medium | Prevent abuse at scale |
| SMS/WhatsApp notifications | Low | Twilio integration |
| i18n (English + Spanish) | Low | next-intl |
| Meal selection during RSVP | Low | Schema extension |

---

## Completed Features Log

| Feature | Date | Notes |
|---------|------|-------|
| Multi-tenancy core | 2026-03 | Full data isolation, RLS, scoped queries |
| Onboarding wizard | 2026-03 | 4-step flow with slug validation |
| Theme system | 2026-03 | 5 presets with CSS variable injection |
| Per-wedding email templates | 2026-03 | DB-stored, toggleable, Mustache variables |
| Address autocomplete | 2026-03 | Geoapify API on all address inputs |
| Shadcn calendar pickers | 2026-03 | Replaced all native date inputs |
| RSVP reminder cron | 2026-03 | Vercel cron, configurable schedules per wedding |
| Admin summary cron | 2026-03 | Weekly A-list guest status email |
| Security audit | 2026-03 | 20 API routes hardened, 6 nav bugs fixed |
| Vercel Analytics + Speed Insights | 2026-03 | Added to root layout |
| Env cleanup | 2026-03 | Removed 10 unused vars, deleted 3 stale files |

---

## Environment Variables

### Production (Vercel)
| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `CLERK_SECRET_KEY` | Clerk auth |
| `NEXT_PUBLIC_APP_URL` | Base URL for emails/metadata |
| `RESEND_API_KEY` | Email sending |
| `STRIPE_SECRET_KEY` | Payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `STRIPE_PRODUCT_BABY_FUND` | Gift type matching (fallback) |
| `STRIPE_PRODUCT_HONEYMOON` | Gift type matching (fallback) |
| `STRIPE_PRODUCT_STUDENT_LOANS` | Gift type matching (fallback) |
| `OPENAI_API_KEY` | AI features |
| `UPLOADTHING_TOKEN` | File uploads |
| `ADMIN_EMAILS` | Superadmin access |
| `RSVP_EMAIL` | Fallback notification recipients |
| `DEFAULT_WEDDING_SLUG` | Legacy URL redirects |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | Address autocomplete |
| `CRON_SECRET` | Vercel cron job auth |
| `DATABASE_URL` | Prisma DB connection |

### Preview Only
| Var | Purpose |
|-----|---------|
| `E2E_TEST_MODE` | Skip email sending |
| `E2E_RESET_SECRET` | DB reset endpoint |
| `TEST_ADMIN_EMAIL` | E2E test auth |
| `TEST_ADMIN_PASSWORD` | E2E test auth |
