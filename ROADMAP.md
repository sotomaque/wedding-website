# The Ceremony — Product & Acquisition Roadmap

> Last updated: 2026-03-31 (end of session)

---

## Current State

Multi-tenant wedding platform at **theceremony.app** with: Clerk auth, Stripe payments, shared AI infrastructure powering 5 features (chat assistant, seating, todos, story writer, email drafts), per-wedding email templates in 2 languages (DB-stored), i18n with next-intl (English + Spanish), address autocomplete (Geoapify), Vercel cron jobs (RSVP reminders, admin summaries, platform summary), welcome emails on signup, platform admin notifications, full E2E test coverage, and a security-hardened API layer (weddingId-scoped queries on all routes).

| Asset | Status |
|-------|--------|
| Domain | `theceremony.app` (production), `helen-and-enrique.com` redirects via middleware |
| Multi-tenancy | Full (weddingId-scoped queries, RLS, cross-tenant security audit complete) |
| AI features | Shared infrastructure + 6 features: **chat assistant (16 tools incl. createEvent, write actions, conversation memory, rich context)**, **RSVP insights dashboard**, seating charts, todo generator, story writer, email drafts |
| Onboarding | 6-step wizard with split-screen live preview (names → URL → date/venue → theme → photos → create) |
| Registry | Self-service admin CRUD (`/admin/registry`) — add/edit/delete/reorder items with Stripe payment links |
| Payments | Stripe (registry + gifting) |
| Email system | Per-wedding DB templates, multi-language (EN/ES), toggleable, welcome emails, 3 cron jobs |
| i18n | English + Spanish via next-intl, per-wedding default language, per-guest language preference |
| Vendor management | ServiceLinks + vendors page |
| Tests | 618 unit + Playwright E2E (parallel read-only, serial mutating) |
| Platform admin | Enhanced stats, growth table, revenue tracking, admin notifications, weekly summary cron |
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
| **AI Planning Assistant (Chat)** | ✅ | `POST /api/admin/ai/chat` | Persistent sidebar chat with 16 tools (10 read + 6 write: createGuest, updateGuest, deleteGuest, addTodo, bulkInvite, createEvent). Conversation memory, rich context (couple identity, stats snapshot, feature toggles). AI Elements UI. |
| **AI Seating Chart** | ✅ | `POST /api/admin/seating-charts/[id]/generate` | Refactored to shared infra. Supports custom prompt for natural language constraints ("keep divorced parents apart", "group college friends"). |
| **AI Todo Generator** | ✅ | `POST /api/admin/ai/todos/generate` | "AI Generate" button + "Custom Prompt" popover on todos page. Date-aware checklist generation, filters past-due items, avoids duplicating existing todos. |
| **AI Story Writer** | ✅ | `POST /api/admin/ai/story/generate` | "AI Write" button in Story tab. Streaming HTML output into Tiptap editor. Tone selection (romantic/humorous/formal/casual). |
| **AI Email Drafts** | ✅ | `POST /api/admin/ai/email-draft/generate` | "AI Draft" button in template editor. Generates subject + HTML body respecting `{{{VARIABLE}}}` placeholders. |
| **AI RSVP Insights** | ✅ | `POST /api/admin/ai/rsvp-insights/generate` | Dashboard card with on-demand AI analysis. Gathers 6 parallel groupBy queries (status, list, side, dietary, invites), generates 3-5 categorized insights (urgency/trend/action/summary). |

### Tier 2 — Next Up

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI Photo Captions** | Low | Medium | GPT-4 Vision on uploaded guest photos → auto-caption. Add `caption` column to `GuestPhoto`. Use `generateTextResult()` from shared client. |
| **AI Budget Optimizer** | Medium | High | Couple enters budget → AI allocates by category. New `Budget` model. Use `generateStructured()` with budget schema. |
| **AI Vendor Recommendations** | Medium | Medium | Based on theme, budget, location → suggest vendor categories and styles. |

### Tier 3 — Strategic

| Feature | Effort | Value | Notes |
|---------|--------|-------|-------|
| **AI Timeline Generator** | High | High | Minute-by-minute wedding day timeline → PDF export. Use `generateStructured()` with timeline schema + react-pdf for output. |
| **AI Style Advisor** | High | High | Upload inspiration images → GPT-4 Vision recommends theme preset + custom color overrides. |

### AI Chat — Next-Level Tools & Context

> The AI chat is shipped with read-only tools + resend/update actions. These improvements unlock full wedding management via natural language (e.g., "invite my friend Cody from highschool as an A-lister and send him the RSVP email").

#### Phase A: Write Tools ✅ COMPLETE
- [x] `createGuest` tool — Create a guest with name, email, side, list, gender. Auto-generates invite code + party.
- [x] `updateGuest` tool — Update any guest field (email, dietary restrictions, list tier, side, etc.)
- [x] `deleteGuest` tool — Remove a guest (with confirmation)
- [x] `createEvent` tool — Create a wedding event with name, date, time, location, isDefault with auto-invite
- [x] `bulkInvite` tool — Send invites to multiple guests by list/status filter
- [x] `addTodo` tool — Create a wedding todo item with auto-incrementing display order

#### Phase B: Richer System Prompt ✅ COMPLETE
- [x] Inject `person1Name`/`person2Name` with their roles (bride/groom) into system prompt so model knows "my friend" = groom's side
- [x] Include wedding feature toggles so model doesn't suggest disabled features
- [x] Include RSVP deadline and days until wedding for time-aware suggestions
- [x] Include summary stats snapshot (guest count, RSVP breakdown, gift totals) so model doesn't need a tool call for basic questions

#### Phase C: Conversation Memory ✅ COMPLETE
- [x] New `ChatMessage` model — store conversation history per wedding admin (migration 053)
- [x] Load recent messages into context on chat open (last 100 messages via GET endpoint)
- [x] Model can reference prior decisions ("earlier you said to put Cody at table 3")
- [x] Clear/archive conversations from admin UI ("New chat" button + DELETE endpoint)

#### Phase D: RAG & Vector Search (Future, When Scale Demands It)
> Not recommended until guest lists exceed ~500 or documents need semantic search. Current keyword/Prisma queries are sufficient at wedding scale.
- [ ] Enable `pgvector` extension in Supabase
- [ ] Embed guest profiles (name + notes + dietary + side) for semantic search ("find my college friends")
- [ ] Embed uploaded document contents for retrieval ("what does the venue contract say about cancellation")
- [ ] `semanticGuestSearch` tool using cosine similarity
- [ ] `searchDocuments` tool with top-K retrieval injected into context

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

### 4.5 Self-Service Stripe Registry (Scalable Payments)

> **Problem:** Today, registry items require manually creating Stripe payment links in the Stripe dashboard, then manually inserting `RegistryItem` DB rows with those URLs. Gift type resolution is hardcoded to 3 global env vars (`STRIPE_PRODUCT_*`). There's no admin UI for registry items and no onboarding path for new couples.

#### Phase A: Admin Registry Item CRUD ✅ COMPLETE
- [x] Admin UI at `/{slug}/admin/registry` to create/edit/delete/reorder `RegistryItem` records
- [x] Fields: title, description, emoji, image URL, Stripe payment link URL
- [x] Toggle items active/inactive with badge display
- [x] Reorder via arrow buttons, nav link added to admin sidebar

#### Phase B: Stripe Connect Integration (Full Self-Service)
- [ ] Integrate **Stripe Connect** (Standard accounts) so each couple connects their own Stripe account
- [ ] New `stripeAccountId` field on `Wedding` model
- [ ] OAuth onboarding flow: admin settings → "Connect Stripe" button → Stripe OAuth → store `stripeAccountId`
- [ ] When creating registry items, auto-generate Stripe payment links via API (`stripe.paymentLinks.create()`) on the couple's connected account
- [ ] Webhook handler routes charges to correct wedding via `account` field on Connect events (replaces `DEFAULT_WEDDING_SLUG` fallback)
- [ ] Platform takes optional application fee (`application_fee_amount` on payment intents) for revenue

#### Phase C: Flexible Gift Types
- [ ] Replace hardcoded `GiftType` enum with per-wedding custom gift categories stored on `RegistryItem`
- [ ] Remove dependency on `STRIPE_PRODUCT_*` env vars — map gift type via `RegistryItem.stripeProductId` instead
- [ ] Webhook resolves gift type by matching `product_id` from charge → `RegistryItem` → custom category
- [ ] Admin can define arbitrary categories (e.g., "Kitchen Fund", "Travel Fund", "Date Night Fund")

#### Phase D: Payment Link Generation UX
- [ ] "Create Payment Link" button in registry admin generates link via Stripe API
- [ ] Configure: amount (fixed vs donor-chooses), currency, custom thank-you page redirect back to `/{slug}/registry/thank-you`
- [ ] Preview card before publishing
- [ ] Automatic `stripeUrl` population on `RegistryItem` — no copy-pasting from Stripe dashboard

#### Migration Notes
- Phase A is backward-compatible — existing weddings keep working with manual Stripe links
- Phase B requires Stripe Connect application approval (platform account)
- Existing `STRIPE_SECRET_KEY` becomes the platform key; per-wedding keys come from Connect
- Webhook must handle both direct charges (legacy) and Connect events (new)

### 4.6 Amazon Wishlist Integration
- [ ] Import items from Amazon wishlist URL (scrape or API)
- [ ] Display as registry items with images, prices, external buy links
- [ ] URL metadata scraping (metascraper) for auto-fill of title, image, price
- [ ] Guest can mark as "purchased" to prevent duplicates
- [ ] Periodic sync to detect fulfilled items

### 4.7 Spotify Playlist Integration
- [ ] Couple links Spotify playlist to wedding (embed URL or playlist ID)
- [ ] Embedded Spotify player on wedding site (public page)
- [ ] Optional "Request a Song" field in RSVP flow
- [ ] New `songRequests` table or field on guest record for song suggestions
- [ ] Admin view of all song requests with export to playlist

### 4.8 Budget Tracker & Expense Management

> Admin page at `/{slug}/admin/budget` for tracking wedding expenses, setting a budget goal, and eventually parsing receipts/contracts via AI.

#### Phase A: Budget Model + Manual Tracking
- [ ] New `BudgetCategory` model: `id, weddingId, name, allocatedCents, spentCents, displayOrder`
- [ ] New `BudgetExpense` model: `id, categoryId, weddingId, title, amountCents, vendor, date, notes, documentId?`
- [ ] Migration SQL for both tables
- [ ] Admin CRUD page: category management (Venue, Catering, Photography, Attire, Flowers, Music, etc.) with allocated vs spent bars
- [ ] Budget goal field on Wedding model (`budgetGoalCents`)
- [ ] Dashboard summary card showing total budget vs total spent
- [ ] Link expenses to existing `Document` records (receipts, contracts)

#### Phase B: AI Receipt/Contract Parsing
- [ ] When a document with category `receipt` or `contract` is uploaded, offer "Parse with AI" button
- [ ] Use GPT-4 Vision on the document (PDF/image) to extract: vendor name, amount, date, line items
- [ ] Auto-create `BudgetExpense` records from parsed data (with user confirmation)
- [ ] Parse contract terms: payment schedule, cancellation policy, deposit amounts
- [ ] Existing `generateStructured()` infrastructure supports this — define Zod schema for parsed receipt/contract

#### Phase C: AI Budget Optimizer (existing Tier 2 item)
- [ ] Couple enters total budget → AI allocates by category based on guest count, location, priorities
- [ ] Uses `generateStructured()` with budget allocation schema
- [ ] Suggests reallocation when overspending in a category

### 4.9 Physical Mail Invitations

> Send physical wedding invitations via API. Guest model already has `mailingAddress` + `physicalInviteSent` fields, and Geoapify address autocomplete is integrated.

#### API Providers (researched)
| Provider | Strengths | Pricing Model |
|----------|-----------|---------------|
| **[Lob](https://www.lob.com)** | Market leader, excellent docs, address verification built-in | Platform subscription + per-piece |
| **[PostGrid](https://www.postgrid.com)** | REST API, HIPAA/SOC-2 compliant, letter + postcard + check support | Pay-as-you-go |
| **[LettrLabs](https://www.lettrlabs.com)** | Handwritten cards, premium feel — great for weddings | Per-piece |
| **[PCM Integrations](https://www.pcmintegrations.com)** | Fast turnaround (1 day postcards), CRM integration | Per-piece |

#### Phase A: Address Validation & Bulk Preview
- [ ] Integrate Lob or PostGrid address verification API to validate `mailingAddress` on Guest records
- [ ] Bulk address validation report: show which guests have valid/invalid/missing addresses
- [ ] Admin UI to review and fix addresses before sending

#### Phase B: Template Designer & Send Flow
- [ ] Physical invite template designer (or upload custom PDF/image design)
- [ ] Preview rendered mail piece per guest (with their name/address merged)
- [ ] Bulk send flow: select guests → review addresses → confirm → API sends to print/mail provider
- [ ] Update `physicalInviteSent` flag on each Guest after successful send
- [ ] Track delivery status via provider webhooks (Lob provides scan events)

#### Phase C: Hybrid Digital + Physical
- [ ] Smart send: guests with email get digital invite, guests without get physical
- [ ] QR code on physical invite links to RSVP page with pre-filled invite code
- [ ] Admin dashboard shows digital vs physical invite status per guest

### 4.10 Inspiration Page
- [ ] New `/[slug]/inspo` public page for wedding inspiration
- [ ] Couple adds Pinterest board links, Instagram posts, or image URLs
- [ ] Grid/masonry layout with link previews (Open Graph metadata)
- [ ] New `WeddingContent` section type: `inspo`
- [ ] Feature toggle: `inspiration: boolean` in `featureToggles`

---

## Phase 5: Positioning & Packaging (Months 3–4)

### 5.1 Brand ✅
- [x] Registered `theceremony.app` — production domain
- [x] `helen-and-enrique.com` redirects to `theceremony.app/helen-and-enrique` via middleware
- [x] Resend verified for `@theceremony.app` emails (DKIM, SPF, DMARC)
- [x] Stripe webhook updated to `theceremony.app`
- [ ] Standalone marketing site (landing page exists but needs polish)

### 5.2 Growth
- [ ] Waitlist (target 500+ signups)
- [ ] Product Hunt launch
- [ ] Press angle: "Former couple builds multi-tenant AI wedding platform"

### 5.3 Technical Due Diligence Package
- [ ] Architecture overview doc (schema, multi-tenancy, auth, payments, AI infra)
- [ ] Test coverage report (533 unit + E2E)
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
| Template variable audit tests | 2026-03 | Static analysis tests catch variable mismatches between code and templates |
| Domain migration | 2026-03 | `theceremony.app` as primary domain, old domain redirects, Resend/Stripe/Clerk updated |
| Platform admin stats | 2026-03 | Revenue, active weddings, new this week, 8-week growth table |
| Admin notification on signup | 2026-03 | ADMIN_EMAILS notified when new wedding created |
| Welcome email | 2026-03 | New `welcome` template type (EN/ES), sent on wedding creation |
| Platform summary cron | 2026-03 | Weekly platform-wide stats email to ADMIN_EMAILS (Monday 7am UTC) |
| AI Planning Assistant (Chat) | 2026-03 | Sidebar chat with 10 read tools (guest lookup, RSVP stats, dietary, events, gifts, resend invite, update RSVP). AI Elements UI, streaming, tool call rendering. |
| Onboarding v2 | 2026-03 | 6-step split-screen wizard with live hero preview (theme picker + photo upload steps). UploadThing server-side upload via UTApi. |
| AI Chat Write Tools | 2026-03 | 5 write tools: createGuest, updateGuest, deleteGuest, addTodo, bulkInvite. Confirmation rules per tool. Multi-step flows (create + invite). |
| AI Chat Rich Context | 2026-03 | System prompt injects couple identity (person1/person2 + side inference), RSVP deadline, days until wedding, feature toggles, stats snapshot. |
| AI Chat Memory | 2026-03 | ChatMessage model (migration 053), per-admin conversation persistence, history restore on panel open, "New chat" clear button. |
| Per-event guest invitations | 2026-03 | Event toggles in Add/Edit Guest forms (defaults from isDefault flag), smart email routing (all events → wedding invite, partial → per-event invites), RSVP sync across all flows. |
| Guest list filters v2 | 2026-03 | Notes search (partial match), event invitation filter (multi-select AND), multi-select RSVP status, seating chart event scoping. |
| Registry Item CRUD | 2026-03 | Self-service admin page at `/admin/registry`. Card grid with add/edit dialog, reorder arrows, active toggle, delete with confirmation. Nav link in admin sidebar. |
| AI RSVP Insights | 2026-03 | Dashboard card with on-demand AI analysis. 6 parallel groupBy queries, generates 3-5 categorized insights (urgency/trend/action/summary) via generateStructured. |
| createEvent chat tool | 2026-03 | 16th chat tool. Creates events with auto displayOrder, date/time parsing, optional isDefault with auto-invite. |

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
