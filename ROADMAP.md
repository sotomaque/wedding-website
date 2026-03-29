# WedPlan — Product & Acquisition Roadmap

> Last updated: 2026-03-28

---

## Current State

Multi-tenant wedding platform with: Clerk auth, Stripe payments, shared AI infrastructure powering 4 features (seating, todos, story writer, email drafts), per-wedding email templates in 2 languages (DB-stored), i18n with next-intl (English + Spanish), address autocomplete (Geoapify), Vercel cron jobs (RSVP reminders + admin summaries), full E2E test coverage, and a security-hardened API layer (weddingId-scoped queries on all routes).

| Asset | Status |
|-------|--------|
| Multi-tenancy | Full (weddingId-scoped queries, RLS, cross-tenant security audit complete) |
| AI features | Shared infrastructure + 4 features: seating charts, todo generator, story writer, email drafts |
| Payments | Stripe (registry + gifting) |
| Email system | Per-wedding DB templates, multi-language (EN/ES), toggleable, cron-based reminders + admin summaries |
| i18n | English + Spanish via next-intl, per-wedding default language, per-guest language preference |
| Vendor management | ServiceLinks + vendors page |
| Tests | 430 unit + Playwright E2E (parallel read-only, serial mutating) |
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
- [x] Per-wedding email templates (DB-stored, toggleable via `isActive`, multi-language)
- [x] Per-wedding themes (5 presets with CSS variable injection)
- [x] Feature toggles, brand image, notification recipients
- [x] Content editor (Hero, Story, Details, Schedule, RSVP)
- [x] Per-wedding default language + per-guest language preference

---

## Phase 2: Onboarding & Self-Service ✅ COMPLETE

- [x] Landing page with feature showcase
- [x] Clerk auth → Dashboard → 4-step onboarding wizard
- [x] Wedding creation seeds: admin, events, content, email templates (EN + ES)
- [x] Theme picker, content editor, feature toggles
- [x] Address autocomplete (Geoapify) on all address inputs
- [x] Shadcn calendar date pickers on all date fields
- [x] i18n with next-intl (English + Spanish), cookie-based language switcher

---

## Phase 3: AI Features

> Shared AI infrastructure in `lib/ai/` powers all features. Every AI route follows the same pattern: `getWeddingContext() → requireAdmin() → build prompt → call shared client → post-process → return`.

### AI Infrastructure ✅ COMPLETE

```
lib/ai/
  client.ts              — getModel(), generateStructured(), createTextStream()
  types.ts               — AIRequestContext, AIFeature, AIResult<T>
  prompts/
    base.ts              — buildSystemPrompt(ctx, featureInstructions)
    seating.ts           — seating chart prompts + custom constraint support
    todo.ts              — todo generator prompts + custom instructions
    story.ts             — story writer prompts (streaming)
    email-draft.ts       — email draft prompts (structured output)
```

**Key patterns:**
- `generateStructured<T>(schema, options)` — for JSON output validated by Zod (todos, email drafts, seating, budget)
- `createTextStream(options)` — for streaming text (story writer, planning assistant)
- Every prompt file exports: `systemPrompt(ctx)`, `buildUserPrompt(input)`, and optionally `outputSchema`
- All AI routes live under `/api/admin/ai/{feature}/{action}`
- Every call includes `weddingId` in the context for logging and tenant scoping

### Tier 1 — Shipped ✅

| Feature | Status | Route | Notes |
|---------|--------|-------|-------|
| **AI Seating Chart** | ✅ | `POST /api/admin/seating-charts/[id]/generate` | Refactored to shared infra. Supports custom prompt for natural language constraints ("keep divorced parents apart", "group college friends"). |
| **AI Todo Generator** | ✅ | `POST /api/admin/ai/todos/generate` | "AI Generate" button + "Custom Prompt" popover on todos page. Date-aware checklist generation, filters past-due items, avoids duplicating existing todos. |
| **AI Story Writer** | ✅ | `POST /api/admin/ai/story/generate` | "AI Write" button in Story tab. Streaming HTML output into Tiptap editor. Tone selection (romantic/humorous/formal/casual). |
| **AI Email Drafts** | ✅ | `POST /api/admin/ai/email-draft/generate` | "AI Draft" button in template editor. Generates subject + HTML body respecting `{{{VARIABLE}}}` placeholders. |

### Tier 2 — Next Up

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI Photo Captions** | Low | Medium | GPT-4 Vision on uploaded guest photos → auto-caption. Add `caption` column to `GuestPhoto`. Use `generateTextResult()` from shared client. |
| **AI RSVP Insights** | Medium | High | Natural language dashboard insights from existing RSVP/dietary/hotel data. Use `generateStructured()` with an insights Zod schema. No schema changes needed. |
| **AI Budget Optimizer** | Medium | High | Couple enters budget → AI allocates by category. New `Budget` model. Use `generateStructured()` with budget schema. |
| **AI Vendor Recommendations** | Medium | Medium | Based on theme, budget, location → suggest vendor categories and styles. |

### Tier 3 — Strategic

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI Planning Assistant (Chat)** | High | Very High | Persistent sidebar chat with live DB context via OpenAI function calling. Use `createTextStream()` with `tools` parameter. The Knot's ChatGPT app — but with real wedding data. |
| **AI Timeline Generator** | High | High | Minute-by-minute wedding day timeline → PDF export. Use `generateStructured()` with timeline schema + react-pdf for output. |
| **AI Style Advisor** | High | High | Upload inspiration images → GPT-4 Vision recommends theme preset + custom color overrides. |

### Adding a New AI Feature — Guide

1. **Create prompt file** at `lib/ai/prompts/{feature}.ts`:
   - Export `systemPrompt(ctx: WeddingContext): string` — use `buildSystemPrompt()` from `base.ts`
   - Export `buildUserPrompt(input: FeatureInput): string` — format user input + DB data
   - Export `outputSchema` (Zod) if using structured output
   - Support optional `customPrompt?: string` in `buildUserPrompt` for user-provided constraints

2. **Create API route** at `app/api/admin/ai/{feature}/{action}/route.ts`:
   - `getWeddingContext()` → `requireAdmin(weddingId)` → parse body → build prompts → call shared client → post-process → return
   - Use `generateStructured()` for JSON output, `createTextStream()` for streaming text

3. **Add UI trigger** (button + dialog/popover) in the relevant admin page:
   - Sparkles icon for "AI Generate" button
   - MessageSquare icon for "Custom Prompt" button with textarea popover
   - Loading state with Loader2 spinner
   - Toast for success/error feedback

4. **Multi-tenancy**: `weddingId` is already injected via `AIRequestContext` in the shared client. The system prompt includes couple names + wedding date via `buildSystemPrompt()`. No additional scoping needed.

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
- [ ] Press angle: "Former couple builds multi-tenant AI wedding platform"

### 5.3 Technical Due Diligence Package
- [ ] Architecture overview doc (schema, multi-tenancy, auth, payments, AI infra)
- [ ] Test coverage report (430 unit + E2E)
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
| Meal selection during RSVP | Low | Schema extension |

---

## Completed Features Log

| Feature | Date | Notes |
|---------|------|-------|
| Multi-tenancy core | 2026-03 | Full data isolation, RLS, scoped queries |
| Onboarding wizard | 2026-03 | 4-step flow with slug validation |
| Theme system | 2026-03 | 5 presets with CSS variable injection |
| Per-wedding email templates | 2026-03 | DB-stored, toggleable, Mustache variables, multi-language |
| Address autocomplete | 2026-03 | Geoapify API on all address inputs |
| Shadcn calendar pickers | 2026-03 | Replaced all native date inputs |
| RSVP reminder cron | 2026-03 | Vercel cron, configurable schedules per wedding |
| Admin summary cron | 2026-03 | Weekly A-list guest status email |
| Security audit | 2026-03 | 20 API routes hardened, 6 nav bugs fixed |
| Vercel Analytics + Speed Insights | 2026-03 | Added to root layout |
| Env cleanup | 2026-03 | Removed 10 unused vars, deleted 3 stale files |
| i18n (English + Spanish) | 2026-03 | next-intl, per-wedding default language, per-guest language, multi-language email templates |
| Shared AI infrastructure | 2026-03 | `lib/ai/` — client, types, prompt pattern, 3 execution modes |
| AI Seating Chart v2 | 2026-03 | Refactored to shared infra, added custom prompt support |
| AI Todo Generator | 2026-03 | Date-aware checklist, custom prompt, auto-filters past-due |
| AI Story Writer | 2026-03 | Streaming HTML into Tiptap, tone selection |
| AI Email Drafts | 2026-03 | Structured output, respects template variables |

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
