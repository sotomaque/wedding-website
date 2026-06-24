# Bug Bounty Audit — Round 3 — 2026-06-24

Third sweep after rounds 1 & 2 merged. This round targets surface the first two
under-covered — **email/template rendering, RSVP/capacity/deadline business
logic, seating auto-generate, i18n & the OpenAPI surface** — and includes a
**re-verification of every still-open `Reported` item** from rounds 1 & 2 (none
were fixed beyond the items that shipped as PRs).

Status legend: **Verified** = code path read end-to-end this round.
**Reported** = agent-traced with cited code, high confidence, not personally re-read.

> **Part A** = new findings this round. **Part B** = the rounds 1–2 backlog,
> re-confirmed still-present against current `main` with ready-to-apply fixes.

## Root-cause themes (round 3)

1. **The registry-class IDOR keeps surfacing** — this round: `setActivityInterest`
   (no `weddingId`), the template viewer/editor *pages* (no `isAdmin` + unscoped
   `fetchTemplate`), and the seating-assignments **POST** (foreign guest ids +
   unscoped `deleteMany`). Same `where: { id, weddingId }` + `isAdmin` fix shape.
2. **Untrusted data rendered without escaping** — guest-supplied fields (dietary
   notes, registry claimant name, self-registration name, hotel notes) flow
   **raw** into email HTML via the template engine. (Rounds 1–2 found the *inline*
   HTML email injections; this is the shared *template engine* itself.)
3. **Business rules enforced only in the UI** — the RSVP **deadline** is never
   checked on any write path, and one of the two per-event RSVP endpoints skips
   the **capacity** gate entirely. The DB will happily accept late / over-capacity
   RSVPs.
4. **Recon surface left open** — the full OpenAPI spec (every admin endpoint +
   body schema) is a world-readable static asset.

---

# Part A — New findings (round 3)

## Severity summary

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| N1 | High | Verified | Email template engine substitutes guest data into HTML without escaping (stored injection) |
| N2 | High | Verified | Template viewer/editor pages read any wedding's template by id (IDOR) |
| N3 | High | Verified | RSVP deadline is never enforced on any write path |
| N4 | High | Verified | Invite-code per-event RSVP (`/api/events/rsvp/submit`) bypasses capacity |
| N5 | High | Verified | `setActivityInterest` mutations not scoped by `weddingId` (cross-wedding) |
| N6 | High | Verified | Full OpenAPI spec served publicly at `/openapi.json` |
| N7 | Medium | Verified | `rsvpDeadline` stored as free-text `String`, parsed by ad-hoc regex |
| N8 | Medium | Reported | Default-event "confirmed" counts disagree across views (plus-ones) |
| N9 | Medium | Reported | Multi-guest RSVP syncs the whole party / misses new plus-ones |
| N10 | Medium | Reported | AI seating generate enforces no capacity and silently drops guests |
| N11 | Low | Verified | Template preview iframe uses `sandbox="allow-same-origin"` |
| N12 | Low | Verified | `i18n/request.ts` reads a never-set header + per-request DB query |
| N13 | Low | Verified | `locale` cookie is path-global → language bleeds across tenants |
| N14 | Low | Verified | RSVP-reminder cron deadline-day match is timezone-fragile |
| N15 | Low | Reported | Bulk-send resend counters are read-modify-write (duplicate sends on retry) |
| N16 | Low | Reported | Activity reorder collides displayOrder with omitted/concurrent rows |

### N1 — Email template engine substitutes guest data into HTML without escaping
- **Status**: Verified
- **Location**: `apps/web/lib/email/render-template.ts:54-64` (`replaceVariables`); guest-controlled sinks at `app/api/rsvp/submit/route.ts` (`DIETARY_RESTRICTIONS`), `app/api/registry/claim/route.ts` (`CLAIMANT_NAME`/`CLAIMANT_EMAIL`), `app/api/events/rsvp/public/route.ts` (`GUEST_NAME`/`GUEST_EMAIL`), `app/api/admin/hotels/send-interest-notification/route.ts` (`NOTES`)
- **Description**: `replaceVariables` does `text.replace(/\{\{\{(\w+)\}\}\}/g, value)` with **no HTML escaping** — raw values are spliced into the template `htmlBody`. The substituted values include unauthenticated guest input (RSVP dietary notes bounded only `max(2000)`, registry claimant name/email, self-registration name, hotel notes).
- **Reproduction**: Submit an RSVP with `dietaryRestrictions = '<img src=x onerror=...>'` (or a registry claim / hotel note with markup). The couple's notification email body then contains the attacker's raw HTML.
- **Impact**: Stored HTML/script injection into the couple's/admin's inbox and the in-app template preview iframe (N11): content spoofing ("payment received" blocks), phishing links, layout breakage. No auth required.
- **Fix**: HTML-escape (`& < > " '`) every value inside `replaceVariables` before insertion. For the few variables that legitimately carry pre-sanitized HTML (e.g. `admin_summary`'s row markup), pass those through an explicit allow-list instead of disabling escaping globally.

### N2 — Template viewer/editor pages read any wedding's template by id
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/templates/[id]/page.tsx:11-26`, `.../[id]/edit/page.tsx` (same shape), via `apps/web/lib/templates/fetch-templates.ts:72-84` (`fetchTemplate` = `findUnique({ where: { id } })`)
- **Description**: Both pages only check `currentUser()` (any signed-in user) then call `fetchTemplate(id)` — no `isAdmin`, no `weddingId` scope, no `template.weddingId` comparison. The mutation API (`api/admin/templates/[id]/route.ts`) correctly gates with `requireAdmin` + weddingId check; these page routes don't.
- **Reproduction**: Any authenticated user opens `/{anySlug}/admin/templates/{templateIdFromAnotherWedding}` (or `/edit`) → the full subject + HTML body of another wedding's template renders.
- **Impact**: Cross-tenant disclosure of another wedding's email templates (copy, branding, embedded URLs). Read-only (mutations are blocked by the API), but crosses the tenant boundary with only a login.
- **Fix**: In both pages resolve `weddingId = await getWeddingId()`, `requireAdmin(weddingId)`, and pass `weddingId` into a scoped `fetchTemplate` (`findFirst({ where: { id, weddingId } })`) / `notFound()` on mismatch.

### N3 — RSVP deadline is never enforced on any write path
- **Status**: Verified
- **Location**: write paths `app/[slug]/(public)/rsvp/actions.ts` (`submitRSVP`/`submitMultiGuestRSVP`), `app/api/rsvp/submit/route.ts`, `app/api/events/rsvp/submit/route.ts`, `app/api/events/rsvp/public/route.ts`; field `schema.prisma:470` `rsvpDeadline String?`
- **Description**: Every reference to `rsvpDeadline` is UI display, AI prompts, the admin countdown, or the reminder cron — **no RSVP write path reads it**. All submit paths persist `rsvpStatus` unconditionally.
- **Reproduction**: Set `rsvpDeadline` to a past date; `POST /api/rsvp/submit {inviteCode, attending:true}` → accepted and written.
- **Impact**: Guests (anyone with an invite code) can add/flip RSVPs after the cutoff, breaking final headcounts already given to caterer/venue. The UI's "respond before the deadline" promise is unenforced.
- **Fix**: Add a server-side deadline check in each write path — but this needs the field to be a real date first (see N7); enforce best-effort parse + reject when past.

### N4 — Invite-code per-event RSVP bypasses capacity
- **Status**: Verified
- **Location**: `apps/web/app/api/events/rsvp/submit/route.ts` (no `capacity`/`canAccommodate` reference anywhere in the file)
- **Description**: The public-token endpoint (`events/rsvp/public/route.ts`) is the only path that checks `event.capacity` (via `canAccommodate` under a `FOR UPDATE` lock). The invite-code endpoint `POST /api/events/rsvp/submit` flips `guestEventInvite.rsvpStatus` to `"yes"` with **no capacity check**.
- **Reproduction**: Event `capacity=100`, 100 confirmed. An invited guest `POST`s `{inviteCode, eventId, attending:true}` → 101 confirmed.
- **Impact**: Capacity-limited events oversell through the invite-code path; the public-link cap is trivially circumvented.
- **Fix**: Apply the same `FOR UPDATE` + `canAccommodate` gate before flipping a pending/no invite to "yes".

### N5 — `setActivityInterest` mutations not scoped by `weddingId`
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/(public)/things-to-do/actions.ts:189-216`
- **Description**: The `inviteCode` is validated wedding-scoped via `getGuestParty`, but the caller-supplied `activityId` is never checked against `weddingId`, and the remove `deleteMany`, the `findFirst`, and the `updateMany` are keyed only on `{ activityId, inviteCode }` — no `weddingId`. Since invite codes are unique only within a wedding, a code string colliding across tenants lets these mutate another wedding's interest rows.
- **Reproduction**: As a guest of wedding A, call `setActivityInterest({ activityId: <wedding-B activity>, inviteCode: <A code>, status })` → cross-wedding delete/update or a mismatched (activity=B, weddingId=A) row.
- **Impact**: Cross-tenant tamper/corruption of activity-interest data on a public endpoint.
- **Fix**: Load `db.activity.findFirst({ where: { id: activityId, weddingId } })` (404 if missing) and add `weddingId` to the deleteMany/findFirst/updateMany `where`.

### N6 — Full OpenAPI spec served publicly at `/openapi.json`
- **Status**: Verified
- **Location**: `apps/web/public/openapi.json` (84 KB static asset), loaded by `app/[slug]/admin/api-docs/page.tsx`
- **Description**: The api-docs *page* is correctly superadmin-gated (`api-docs/layout.tsx`), but the spec lives in `public/`, served as a static asset at `https://<host>/openapi.json` with no auth (`proxy.ts` only protects `/(.*)/admin`, `/dashboard`, `/onboarding`, `/platform-admin`). The spec enumerates every admin endpoint with full request/response schemas and auth requirements.
- **Reproduction**: `curl https://<host>/openapi.json` unauthenticated → complete spec.
- **Impact**: Information disclosure of the entire private admin attack surface (paths, methods, body shapes) — recon aid for the IDOR/authz probing covered in prior rounds.
- **Fix**: Serve the spec from an authenticated route handler behind the same superadmin check, and point `swagger-ui-client.tsx` at that protected URL; remove it from `public/`.

### N7 — `rsvpDeadline` stored as free-text `String`, parsed by ad-hoc regex
- **Status**: Verified
- **Location**: `packages/db/prisma/schema.prisma:470`; `app/[slug]/admin/page.tsx:58-71`; `app/api/cron/rsvp-reminders/route.ts:60-62`
- **Description**: The column is free text (seed: `"Please respond by March 1, 2026"`). The admin card recovers a date via regex stripping then `new Date(...)`; the cron does a bare `new Date(wedding.rsvpDeadline)`. Any phrasing outside the hardcoded prefix parses to `NaN` and silently falls back to `weddingDate`.
- **Impact**: Reminder cron + countdown key off the wrong date for most natural-language deadlines; makes server-side deadline enforcement (N3) unreliable.
- **Fix**: Store the deadline as `DateTime`/`@db.Date` (with timezone); keep any free-text label separate.

### N8 — Default-event "confirmed" counts disagree across views
- **Status**: Reported
- **Location**: `app/[slug]/admin/events/page.tsx:31-33` (counts all guests incl. plus-ones) vs `lib/db/admin/event-rsvp-breakdown.ts:98-99` (`isPlusOne: false`); public gate `events/[token]/page.tsx:111-113` counts invite rows
- **Description**: For `isDefault` events the list card, the detail breakdown, and the public "isFull" banner compute "confirmed" from different guest sets, so the same event shows different numbers; `responseRate` is over primaries-only while `inviteCount` includes plus-ones.
- **Fix**: Pick one rule (plus-ones count as heads) and apply it uniformly.

### N9 — Multi-guest RSVP syncs the whole party / misses new plus-ones
- **Status**: Reported
- **Location**: `app/[slug]/(public)/rsvp/actions.ts:726-746`
- **Description**: `allSubmittedIds` is derived from `partyGuests` (every member found by the code), so (a) a member not in this submission still has their `guestEventInvite.rsvpStatus` overwritten, and (b) `partyGuests` is read before plus-ones are created, so a brand-new plus-one's invite rows are never synced.
- **Fix**: Build the sync list from the guests actually submitted plus any plus-one ids created this call.

### N10 — AI seating generate enforces no capacity and silently drops guests
- **Status**: Reported
- **Location**: `app/api/admin/seating-charts/[id]/generate/route.ts:173-213`; apply path `seating/[id]/chart-editor.tsx:434-455`
- **Description**: Capacity is only *requested* of the model in prose; the route does no count-vs-capacity check and never reconciles the returned set against the full guest list — omitted guests are silently unseated, duplicates are de-duped arbitrarily downstream, and `guests > seats` is never surfaced. (The manual drag path *does* check capacity; only the AI path bypasses it.)
- **Fix**: In the generate route, trim/skip over-capacity assignments and report `unassignedGuestIds`/`skippedOverCapacity`; dedupe; error when `guests > totalSeats`.

### N11 — Template preview iframe uses `sandbox="allow-same-origin"`
- **Status**: Verified
- **Location**: `app/[slug]/admin/templates/template-editor.tsx:336-341`, `.../[id]/template-viewer.tsx:150-155`
- **Description**: `<iframe srcDoc={htmlBody} sandbox="allow-same-origin" />` shares the parent origin. No `allow-scripts` today, so inline `<script>` won't run — but `allow-same-origin` without `allow-scripts` is the risky pairing, and combined with N1/N2 (attacker-influenced/cross-tenant body reaching this iframe) it's a latent same-origin render of untrusted HTML.
- **Fix**: Use `sandbox=""` (fully sandboxed) or render the preview from a blob URL / separate origin.

### N12 — `i18n/request.ts` reads a never-set header + per-request DB query
- **Status**: Verified
- **Location**: `apps/web/i18n/request.ts:17-28`
- **Description**: Reads `x-wedding-locale` "set by middleware" — but `proxy.ts` never sets it (dead code). Every non-cookie request then falls through to a `db.wedding.findUnique` for `defaultLanguage`. Both real paths validate against the `locales` allow-list (no injection), so this is dead code + an avoidable per-request DB round-trip (and a spoofable-header footgun if a future dev "wires it up").
- **Fix**: Remove the `x-wedding-locale` block (or have middleware set it from the validated cookie).

### N13 — `locale` cookie is path-global → language bleeds across tenants
- **Status**: Verified
- **Location**: `apps/web/components/set-locale-action.ts:10-14`
- **Description**: `setLocaleCookie` writes `locale` with `path: "/"`, and `request.ts` treats the cookie as highest priority over each wedding's `defaultLanguage`. Validated against the allow-list (no injection), but a guest switching language on wedding A overrides wedding B's configured default too.
- **Fix**: Scope the cookie per wedding (`locale_<slug>`) or store the preference keyed by wedding.

### N14 — RSVP-reminder cron deadline-day match is timezone-fragile
- **Status**: Verified
- **Location**: `app/api/cron/rsvp-reminders/route.ts:31-32, 60-78, 96-98`
- **Description**: `today` is built in server-local time while `new Date(rsvpDeadline)` on a date-only string parses as UTC midnight; the exact-equality day comparison shifts by one when the server runs west of UTC. `daysRemaining` mixes the same UTC-vs-local epochs.
- **Fix**: Normalize both deadline and "today" to the wedding's `timezone` before extracting the Y/M/D key.

### N15 — Bulk-send resend counters are read-modify-write
- **Status**: Reported
- **Location**: `app/api/admin/guests/bulk-send-email/route.ts:184-189` (also bulk calendar `:177-185`, activities `:120-128`)
- **Description**: Counters increment via `(guest.numberOfResends || 0) + 1` from the value fetched at request start, with no idempotency key. Two concurrent clicks / a client retry both pass the gate and both `sendEmail`, emailing the guest twice and losing an increment. (Broadcast is correctly weddingId-scoped, per-guest `To:`, no recipient leak.)
- **Fix**: Use atomic `{ numberOfResends: { increment: 1 } }` and a per-batch idempotency/`sentAt`-window guard.

### N16 — Activity reorder collides displayOrder with omitted/concurrent rows
- **Status**: Reported
- **Location**: `app/[slug]/admin/activities/actions.ts:175-198`
- **Description**: `reorderActivities` assigns `displayOrder = index+1` only for the client-supplied ids; an activity omitted (e.g. concurrently created) keeps a stale order that collides, and `createActivity` derives order from `_max+1` with no uniqueness, so a create racing a reorder can duplicate an order value → ambiguous render order.
- **Fix**: Reorder against the server's current full set inside the transaction, or normalize/uniquify order.

---

# Part B — Rounds 1–2 backlog, re-confirmed still-open

All ten were re-verified against current `main` (offending lines quoted by the
audit). None were silently fixed. Listed with the minimal fix; full repro is in
`docs/bug-bounty-audit.md` / `docs/bug-bounty-audit-2.md`.

| ID | Sev | Status | Location | Title & minimal fix |
|----|-----|--------|----------|---------------------|
| B1 | High | Verified | `api/admin/guests/route.ts:97` | Guest POST adopts cross-wedding `partyId`+invite code → `findFirst({where:{id:partyId, weddingId}})` |
| B2 | High | Verified | `api/admin/guests/route.ts:222` | Guest POST writes invite rows for foreign `eventIds` → filter to events in `weddingId` before `createMany` |
| B3 | High | Verified | `api/admin/seating-charts/[id]/assignments/route.ts:81` | POST `deleteMany` unscoped + inserts unvalidated foreign `guestIds` → add `weddingId` to delete; filter guestIds to this wedding |
| B4 | Medium | Verified | `schema.prisma:237` | `Guest.inviteCode` no DB uniqueness → `@@unique([weddingId, inviteCode])` + migration |
| B5 | Medium | Verified | `api/admin/hotels/send-interest-notification/route.ts` | Unauthenticated send → internal shared-secret header or rate-limit per code |
| B6 | Medium | Verified | `api/webhooks/stripe/route.ts` | No event-id dedupe / non-unique payment-intent → `@unique` on chargeId/paymentIntentId + swallow P2002 (or processed-events table) |
| B7 | Medium | Verified | `app/[slug]/admin/gifts/actions.ts:204` | Mixed-currency totals summed & rendered USD → group by `currency`, render per-currency |
| B8 | Low | Verified | `calendar-client.tsx:479`, `trip-planner-client.tsx:272` | Raw ISO time render → format `HH:MM` (12-hour, `timeZone:"UTC"`) |
| B9 | High | Verified | `lib/ai/tools/wedding-tools.ts:643` | `deleteGuest` tool `delete({where:{id}})` unscoped → add `weddingId` |
| B10 | Medium | Verified | `app/[slug]/admin/settings/actions.ts:385` | `removeAdmin` no last-owner guard → block when removing would drop owner count to 0 |

# Part C — Client / React correctness (round 3)

11 verified client-side defects (user-visible). All **Verified** (read end-to-end).

| ID | Severity | Location | Bug & fix |
|----|----------|----------|-----------|
| C1 | High | `components/rich-text-editor.tsx:28-45` + `customization/content-editors.tsx:209-218` | TipTap `useEditor` reads `content` only at construction; AI-generated Story never appears and is overwritten on next keystroke (then saved). Fix: `useEffect` calling `editor.commands.setContent(content, {emitUpdate:false})` when `content` changes. |
| C2 | High | `app/[slug]/admin/vendors/vendors-manager.tsx:203-227` | Reorder uses `filtered` index for arrows but swaps against the **unfiltered** `links` array → moves the wrong (hidden) item and persists corrupted order when a category filter is active. Fix: disable arrows while filtered, or swap within the filtered subset. |
| C3 | High | `app/[slug]/admin/events/events-client.tsx:216` | Editing an event with a cleared date → `data.event.eventDate.split("T")` on `null` throws (PATCH returns `eventDate:null`). Fix: `eventDate ? eventDate.split("T")[0] : null` (POST path already guards). |
| C4 | Medium | `app/[slug]/admin/guests/guests-table.tsx:255-274` | No `getRowId`, so `rowSelection` is keyed by row **index**; after a server re-fetch (sort/filter/page) selected indices point at different guests → **bulk delete/email/set-RSVP hit the wrong guests**. Same in `invites-client.tsx`. Fix: `getRowId: (row) => row.id`. |
| C5 | Medium | `app/[slug]/(public)/things-to-do/interest-calendar-modal.tsx:58-66` | `selectedDate.toISOString().split("T")[0]` shifts a Pacific-time guest's pick one day earlier (saved + cross-guest matching). Fix: build the key from local components (`toDateKey`). |
| C6 | Medium | `app/[slug]/admin/registry/registry-manager.tsx:124-134` | `setShowDialog(false)` runs on both branches → a failed **create** closes the dialog and discards the entered form. Fix: close only inside the success branch (mirror edit). |
| C7 | Medium | `app/[slug]/admin/guests/edit-guest-sheet.tsx:66-73,97` | (a) `toDateInput` ISO-shifts travel dates one day for US admins; (b) `localRsvpStatus` never resyncs when the `guest` prop changes → stale RSVP highlight. Fix: local date components + `useEffect` reset on `guest.id`. |
| C8 | Medium | `app/[slug]/admin/parties/parties-table.tsx:85` | `parseInt(?page)` → `NaN` for `?page=abc` → "Showing page NaN", broken Next/Prev. Fix: guard `Number.isNaN`. |
| C9 | Medium | `(public)/hotels/hotel-card.tsx:28-53`, `(public)/things-to-do/activity-card.tsx:44-84` | Optimistic interest buttons never check the action result → on failure they silently revert with no error; activity modal stays open on failure. Fix: capture result, toast on failure. |
| C10 | Low | seating `chart-editor.tsx:760`, `seating-client.tsx:76-92`, `events-client.tsx:263-277`, rsvp `code-entry.tsx:62-66` | Mutating buttons lack an in-flight guard → double-click issues duplicate mutations (Add Table creates dupes). Fix: in-flight state + `disabled`. |
| C11 | Low | `(public)/events/[token]/public-event-rsvp.tsx:22-28`, `events/rsvp/event-rsvp-form.tsx:49-55` | `formatTime` guards `hours` but not `minutes` → `"9"` renders `9:undefined AM`. Fix: `(split[1] ?? "00").padStart(2,"0")`. |

---

## Methodology

Six parallel read-only hunters over: email/template rendering, RSVP/capacity/
deadline logic, seating-generate + communications, client React, i18n + OpenAPI,
plus a consolidation pass re-verifying the open backlog. The High-severity new
items (N1–N6) plus the backlog were personally re-traced against source
(**Verified**); the remainder are agent-traced with cited code (**Reported**).
