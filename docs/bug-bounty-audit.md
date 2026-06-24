# Bug Bounty Audit — 2026-06-24

A multi-dimension sweep of the wedding-website app (auth/multi-tenancy, public
endpoints, payments, cron/email, data layer, application logic). Findings are
sorted by severity. Each carries a **Status**:

- **Verified** — I read the code path end-to-end and confirmed the bug myself.
- **Reported** — surfaced by an audit pass with high confidence; code cited but
  not independently re-traced. Worth confirming before/while fixing.

> **Scope note:** "cross-tenant" means one wedding's admin (or any authenticated
> user, or in some cases an anonymous caller) can read or mutate **another
> wedding's** data. This app is multi-tenant (`/[slug]/...`), so tenant
> isolation is the dominant risk class.

## Root cause themes

Most of the high-severity findings collapse into two systemic gaps:

1. **Server Actions do their own auth — or don't.** Next.js Server Actions are
   independently-invocable POST endpoints dispatched by action ID. The
   middleware (`apps/web/proxy.ts:124`) only calls `auth.protect()` on
   `/(.*)/admin(.*)` — that is **authentication**, not per-wedding
   **authorization**, and it is not a reliable boundary for server actions
   (which can be dispatched against non-protected routes). Several action files
   (`settings`, `registry` partially, `hotels`, `activities`, `vendors`,
   `documents`, `content`) correctly call `isAdmin(weddingId)`. Others
   (`parties`, `todos`, `gifts`) **do not** — and several that do still forget
   to scope the mutation's `where` by `weddingId`.

2. **`where: { id }` without `weddingId`.** Even with `isAdmin` passing for the
   *caller's* wedding, mutating/reading a row by primary key alone lets the
   caller act on **any** wedding's row (IDOR). The correct pattern already
   exists in the codebase: `releaseRegistryClaim` uses
   `updateMany({ where: { id, weddingId } })`.

**Recommended remediation order:** Critical → High access-control items first
(they share a one-line fix shape: add `isAdmin(weddingId)` and constrain every
`where` by `weddingId`), then the payment-integrity and guest-facing
correctness bugs, then the rest.

---

## Severity summary

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| C1 | Critical | Verified | `parties` server actions: no authz + no wedding scoping (cross-tenant destroy) |
| H1 | High | Verified | `gifts` read actions: no authz; `getGiftWithGuest` unscoped (donor PII/financial leak) |
| H2 | High | Verified | `registry` mutations not scoped by `weddingId` (cross-tenant edit/delete) |
| H3 | High | Verified | `todos` server actions: no authz + no wedding scoping |
| H4 | High | Reported | Seating assignments `deleteMany` unscoped by `weddingId` (cross-tenant wipe) |
| H5 | High | Verified | `formatEventTime` mis-parses Prisma `Date` → garbled times in invite emails |
| H6 | High | Verified | Weak randomness (`Math.random`) for invite codes & event tokens |
| H7 | High | Reported | No rate limiting on invite-code / token verification (PII enumeration) |
| H8 | High | Reported | Guest `inviteCode` has no DB uniqueness constraint (silent collisions) |
| H9 | High | Reported | Stripe webhook idempotency is read-then-write (double-counted gifts) |
| H10 | High | Reported | Mixed-currency gift totals summed & rendered as hardcoded USD |
| H11 | High | Reported | Unauthenticated hotel-interest endpoint (admin email spam / PII injection) |
| H12 | High | Reported | Admin calendar & public trip-planner render raw ISO timestamps |
| M1 | Medium | Reported | Guest PATCH adopts a party (and invite code) from another wedding |
| M2 | Medium | Reported | RSVP `/verify` returns full Guest rows (PII/internal-field over-exposure) |
| M3 | Medium | Reported | Registry claim/unclaim authenticated only by claimant email |
| M4 | Medium | Reported | Unauthenticated guest-photo save accepts arbitrary URL (gallery injection) |
| M5 | Medium | Reported | `merge-guests` deletes source's plus-ones via cascade (data loss) |
| M6 | Medium | Reported | iCal late-evening event: `addTwoHours` wraps → DTEND before DTSTART |
| M7 | Medium | Reported | `toDateStr` uses local getters → event off-by-one day behind UTC |
| M8 | Medium | Reported | RSVP-reminder cron dedupe is a non-atomic read-then-write race |
| M9 | Medium | Reported | Admin/platform summary emails inject unescaped guest/couple data (HTML injection) |
| M10 | Medium | Reported | Stripe partial refund flips whole gift to "refunded" (understates totals) |
| L1 | Low | Reported | Gift PATCH links gift to a guest from another wedding |
| L2 | Low | Reported | Send-then-flag is non-atomic across all email senders |
| L3 | Low | Reported | `CRON_SECRET` optional → misconfig silently disables all crons |
| L4 | Low | Reported | Self-registration name-match can hijack an existing guest's RSVP |
| L5 | Low | Reported | `events/rsvp/{submit,verify}` lack Zod validation |
| L6 | Low | Reported | Sanitizer allows `target` without forcing `rel` (reverse tabnabbing) |
| L7 | Low | Reported | Email-log records only the first recipient of multi-recipient sends |
| L8 | Low | Reported | Activity-interest writes can duplicate (no unique constraint / transaction) |
| L9 | Low | Reported | Public-RSVP capacity reads happen outside the `FOR UPDATE` lock |
| L10 | Low | Reported | `event-rsvp-breakdown.toTimeString` returns full ISO (latent contract bug) |

---

## Critical

### C1 — `parties` server actions have no authorization and no wedding scoping
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/parties/actions.ts` — `updateParty:108`, `moveGuestToParty:138`, `mergeParties:187`, `deleteParty:297`, `getPartyById:78`
- **Description**: The file imports only `getWeddingId` — **no `isAdmin`/`requireAdmin` anywhere**. Several actions mutate by raw id with no `weddingId` constraint: `updateParty` does `db.party.update({ where: { id: partyId } })` (line 118); `moveGuestToParty` does `db.guest.update({ where: { id: guestId } })` and `db.party.findUnique({ where: { id: targetPartyId } })` (152, 162); `mergeParties` does `db.guest.updateMany({ where: { partyId: sourcePartyId } })` then `db.party.delete({ where: { id: sourcePartyId } })` (203, 212); `deleteParty`'s guard counts guests scoped by `weddingId` but the `db.party.delete({ where: { id } })` itself (315) is unscoped, so an *empty* party in another wedding can be deleted. `getPartyById` reads any party by id cross-tenant.
- **Reproduction**: As any authenticated Clerk user (e.g. admin of wedding B, or a guest who self-registered an account), invoke the `mergeParties`/`deleteParty`/`updateParty`/`moveGuestToParty` action with a `partyId`/`guestId` belonging to victim wedding A (craft the server-action POST with the action ID). No admin check runs; no `weddingId` constrains the row.
- **Impact**: Cross-tenant rename/merge/delete of any wedding's parties and reassignment of guests + their invite codes — corrupts another couple's entire guest list and RSVP routing. Destructive.
- **Fix**: At the top of every mutating action: `const weddingId = await getWeddingId(); const auth = await isAdmin(weddingId); if (!auth.authorized) return { success: false, error: auth.error ?? "Unauthorized" }`. Constrain every mutation with `where: { id, weddingId }` (use `updateMany`/`deleteMany` and check `count`). Scope `getPartyById` with `findFirst({ where: { id, weddingId } })`.

---

## High

### H1 — `gifts` read actions have no authorization; `getGiftWithGuest` is unscoped
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/gifts/actions.ts` — `getGifts:55`, `getGiftWithGuest:119`, `getGuestOptions:164`, `getGiftStats:180`
- **Description**: No `isAdmin` import or call in the file. `getGifts`/`getGuestOptions`/`getGiftStats` scope by `weddingId` but perform **no authorization**. `getGiftWithGuest` does `db.gift.findUnique({ where: { id: giftId } })` (121) with **no `weddingId` and no auth** — any gift across tenants by id. Contrast the gifts API route (`api/admin/gifts/route.ts`) which correctly `requireAdmin`s, and `registry/actions.ts` which gates every action with `isAdmin`.
- **Reproduction**: Invoke `getGiftWithGuest` with a gift id from another wedding → returns donor name, email, amount, Stripe IDs, and matched guest email with no auth/scope. Or invoke `getGifts` under a victim slug to enumerate all donations.
- **Impact**: Disclosure of donor PII (names, emails) and donation amounts + Stripe identifiers.
- **Fix**: Add `const auth = await isAdmin(await getWeddingId()); if (!auth.authorized) throw …` to all four; scope `getGiftWithGuest` with `findFirst({ where: { id: giftId, weddingId } })`.

### H2 — `registry` mutations are not scoped by `weddingId`
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/registry/actions.ts` — `updateRegistryItem:146`, `deleteRegistryItem:170`, `reorderRegistryItems:193`, `toggleRegistryItemActive:220`
- **Description**: Each action **does** call `isAdmin(weddingId)` (good), but then mutates by primary key only: `db.registryItem.update({ where: { id } })` / `.delete({ where: { id } })`. `RegistryItem.id` is a global UUID. The sibling `releaseRegistryClaim:284` correctly uses `updateMany({ where: { id, weddingId } })` — proving the pattern was simply missed in the others. `reorderRegistryItems` additionally fans out N concurrent updates with no transaction.
- **Reproduction**: An admin/editor of wedding A (passes `isAdmin(weddingId_A)`) calls `deleteRegistryItem(idFromWeddingB)` or `updateRegistryItem(idFromWeddingB, { priceCents: 1 })` → wedding B's item is mutated/deleted.
- **Impact**: Cross-tenant edit/delete/reorder/toggle of another wedding's registry by any wedding admin.
- **Fix**: Use `updateMany`/`deleteMany` with `where: { id, weddingId }` (and assert `count === 1`); wrap reorder in `db.$transaction`.

### H3 — `todos` server actions have no authorization and no wedding scoping
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/todos/actions.ts` — `toggleTodo:70`, `deleteTodo:89`, `updateTodoTitle:104`
- **Description**: No `isAdmin` in the file. These mutate by raw id with only a `slug` lookup for revalidation: `db.weddingTodo.update({ where: { id } })` / `.delete({ where: { id } })`. `addTodo`/`getTodos` are at least `weddingId`-scoped on the read side; the mutators on existing rows are not, and none check admin.
- **Reproduction**: Any authenticated user invokes `deleteTodo(idFromAnotherWedding)` → the row is deleted regardless of tenant or admin status.
- **Impact**: Cross-tenant tampering/deletion of any wedding's planning checklist. (Lower data value than C1, hence High not Critical.)
- **Fix**: Add `isAdmin(weddingId)` gate; scope mutations with `updateMany`/`deleteMany({ where: { id, weddingId } })`.

### H4 — Seating-assignments POST deletes assignments cross-tenant
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/seating-charts/[id]/assignments/route.ts:80-96` (delete at 81-83)
- **Description**: The route is admin-gated for the caller's wedding and validates table ownership, but when clearing prior assignments it runs `db.guestTableAssignment.deleteMany({ where: { guestId: { in: guestIds } } })` with **no `weddingId`**. `guestIds` come from the body and are validated only as UUIDs (line 48), not as belonging to the caller's wedding. The delete + subsequent `createMany` are also not in a transaction.
- **Reproduction**: As admin of wedding A, POST to `/api/admin/seating-charts/{A-chart-id}/assignments` with a `tableId` valid in chart A and a `guestId` belonging to wedding B → B's existing table assignment is deleted.
- **Impact**: An admin can wipe arbitrary other weddings' guest-to-table assignments by knowing/guessing guest UUIDs; partial-failure can leave guests unseated.
- **Fix**: `deleteMany({ where: { guestId: { in: guestIds }, weddingId } })`; validate supplied `guestId`s belong to `weddingId`; wrap delete+create in `db.$transaction`.

### H5 — `formatEventTime` mis-parses Prisma `Date` time values → garbled times in invite emails
- **Status**: Verified
- **Location**: `apps/web/lib/utils/event-format.ts:81-88` (`to12Hour`); callers `apps/web/app/api/admin/events/[id]/send-invites/route.ts:108`, `apps/web/app/api/admin/guests/route.ts:345`
- **Description**: `startTime`/`endTime` are `@db.Time(6)` (`schema.prisma:60-61`), so Prisma returns JS `Date` (anchored 1970-01-01). `to12Hour` does `const str = time instanceof Date ? time.toISOString() : String(time); const [hours, minutes] = str.split(":")`. For `1970-01-01T18:00:00.000Z`, `split(":")` yields `hours = "1970-01-01T18"`, and `Number.parseInt("1970-01-01T18", 10) = 1970`; `1970 % 12 = 2` → **"2:00 PM" for a 6 PM event**. Callers pass the raw Prisma `Date`. Existing unit tests only pass strings (`"15:30"`), so they're green while the real path is broken. A correct local implementation exists at `wedding-content-data.ts:196` (uses `toISOString().slice(11,16)`).
- **Reproduction**: Send an event invite for an event starting 18:00 → email shows "2:00 PM".
- **Impact**: Every per-event invitation email (single-event invite + partial-event guest creation) shows guests a wrong time.
- **Fix**: In `to12Hour`, when input is a `Date`, take `time.toISOString().slice(11,16)` ("HH:MM") before splitting.

### H6 — Weak randomness (`Math.random`) for invite codes and event RSVP tokens
- **Status**: Verified
- **Location**: `apps/web/lib/utils/invite-code.ts:13`, `apps/web/lib/utils/event-token.ts:13` (also the inline `generateInviteCode` in `parties/actions.ts:390`)
- **Description**: Both generators index the alphabet with `Math.random()`, a non-cryptographic PRNG (V8 xorshift128+). The event-token comment claims "16 chars … ~79 bits — not guessable in any practical sense," but that entropy assumes a CSPRNG; `Math.random` output is predictable from observed outputs. Invite codes are only 8 chars from a 32-symbol alphabet (~40 bits theoretical) and are the **sole** guest auth credential gating `/api/rsvp/*` and guest PII.
- **Reproduction**: Self-register repeatedly via `POST /api/events/rsvp/public` (mode `name`), which mints real codes; collect a sequence; recover PRNG state / predict adjacent codes/tokens; feed a predicted code to `GET /api/rsvp/verify?code=…` to read another party's PII.
- **Impact**: Guest impersonation, PII disclosure, RSVP tampering; the security claim in the token comment is materially overstated.
- **Fix**: Generate with `crypto.randomInt()` / `crypto.getRandomValues()`; lengthen codes; correct the comment.

### H7 — No rate limiting on invite-code / token verification
- **Status**: Reported
- **Location**: `apps/web/app/api/rsvp/verify/route.ts:14`, `apps/web/app/api/events/rsvp/verify/route.ts:13`, `apps/web/app/api/events/rsvp/public/route.ts:37`, `apps/web/app/[slug]/(public)/rsvp/actions.ts:82`
- **Description**: No throttling on any public verification/submission endpoint (repo-wide search for rate-limit infra finds none). `GET /api/rsvp/verify` returns full guest records for a valid code and 404 otherwise — a perfect brute-force oracle. Combined with H6's weak ~40-bit space, enumeration is practical.
- **Reproduction**: Script `GET /api/rsvp/verify?code=…` cycling codes; a 200 with `{guests}` reveals a valid party.
- **Impact**: Mass disclosure of guest PII; RSVP hijack.
- **Fix**: Per-IP and per-wedding rate limiting (e.g. Upstash) on all code/token endpoints; generic constant-time error responses.

### H8 — Guest `inviteCode` has no DB uniqueness constraint
- **Status**: Reported
- **Location**: `packages/db/prisma/schema.prisma:237` (`inviteCode String? @map("invite_code")` — no `@unique`); generation sites `api/admin/guests/route.ts:110-124`, `api/events/rsvp/public/route.ts:141-149`
- **Description**: Unlike `Party.inviteCode @unique` (340) and `Event.publicRsvpToken @unique` (77), `Guest.inviteCode` has no unique index. Self-registration checks for collisions with a SELECT loop then `create`, outside any transaction or constraint — a classic read-then-write race; two concurrent registrations can both insert the same code.
- **Reproduction**: Two simultaneous self-registrations that generate the same code both pass the SELECT check and both insert.
- **Impact**: Two distinct parties share a code; `verifyInviteCode`/`submitRSVP` treat the first match as "the" guest → one party can view/overwrite another's RSVP & PII.
- **Fix**: Add a partial unique index on `(weddingId, inviteCode)` and rely on catching the unique violation to retry.

### H9 — Stripe webhook idempotency is read-then-write, not atomic
- **Status**: Reported
- **Location**: `apps/web/app/api/webhooks/stripe/route.ts:511-616` (succeeded), `746-783` (failed), `909-984` (pending)
- **Description**: Dedup is `findFirst` on `stripePaymentIntentId` then `stripeChargeId`, later followed by `db.gift.create` — no transaction, no `upsert`, and **no dedupe on Stripe `event.id`** (logged at 1143, never persisted). `stripePaymentIntentId` is only `@index`, not `@unique` (schema 99, 126). Stripe delivers at-least-once and retries on timeout; two concurrent deliveries can both pass `findFirst` before either `create` commits. The pending→succeeded path is worse: a pending row without a chargeId yet can let a second row through.
- **Reproduction**: Stripe retries a slow `charge.succeeded` (handler does extra slow work: `paymentIntents.retrieve` at 427, guest lookup, email) while the first is mid-flight → two `create`s; one may 500 and trigger yet another retry.
- **Impact**: Double-counted gifts inflate totals; replayed events reprocessed; retry storms.
- **Fix**: Persist `event.id` in a processed-events table with a unique constraint and short-circuit on replay; or make the gift write an idempotent `upsert` on a unique `stripePaymentIntentId`, treating unique-violation as success (return 200, not 500).

### H10 — Gift totals sum mixed currencies and render as hardcoded USD
- **Status**: Reported
- **Location**: `apps/web/app/[slug]/admin/gifts/actions.ts:183-211` (`getGiftStats`), `api/admin/gifts/route.ts:67-85`, display `gifts-table.tsx:89-90,278`
- **Description**: The webhook stores `currency: charge.currency` verbatim and `amountCents` in that currency's minor unit. `getGiftStats` sums `_sum.amountCents` across all groups into one `grand_total` with no currency dimension; the table formats it with `currency: "USD"` hardcoded.
- **Reproduction**: One 5000 JPY gift + one $50 USD gift → `grand_total = 10000` shown as "$100.00" (JPY has no minor unit).
- **Impact**: Incorrect financial totals whenever any non-USD gift exists.
- **Fix**: Group/sum by currency; show per-currency subtotals; don't hardcode "USD".

### H11 — Unauthenticated hotel-interest notification endpoint
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/hotels/send-interest-notification/route.ts:24-83`
- **Description**: No `requireAdmin` and no shared secret. The only "auth" is that a guest with the supplied `inviteCode` exists in the host-resolved wedding — existence of a (short, shareable) invite code is not caller authentication. Each call emails `getNotificationRecipients(settings)` with no rate limit or dedupe, and injects guest name/email/phone into the email body.
- **Reproduction**: With any valid invite code, `POST /api/admin/hotels/send-interest-notification` `{ inviteCode, hotelId }` repeatedly.
- **Impact**: Flood the couple/admin notification inboxes; Resend cost / deliverability abuse; PII injection into trusted email.
- **Fix**: Require a server-only shared-secret header (validated against env) for this internal endpoint, or move the send into the server action so it never crosses an HTTP boundary; rate-limit per invite code.

### H12 — Admin calendar and public trip-planner render raw ISO timestamps
- **Status**: Reported
- **Location**: `apps/web/app/[slug]/admin/calendar/{page.tsx:88-97,calendar-client.tsx:477-481}`; `apps/web/app/[slug]/(public)/trip-planner/{page.tsx:88-91,trip-planner-client.tsx:270-273}`
- **Description**: Both serialize `startTime: e.startTime.toISOString()` (full `1970-01-01T18:00:00.000Z`) and render it raw (`{e.startTime}{e.endTime ? ` – ${e.endTime}` : ""}`) with no formatting — unlike `events/[id]/page.tsx` which strips the `T…` segment.
- **Reproduction**: Any timed event shows `1970-01-01T18:00:00.000Z – 1970-01-01T20:00:00.000Z` instead of `6:00 PM – 8:00 PM`.
- **Impact**: Admin calendar unreadable for timed events; public trip-planner shows garbage timestamps to guests.
- **Fix**: Serialize/format to `"HH:MM"` (`toISOString().slice(11,16)`) and run through a 12-hour formatter (same fix shape as H5).

---

## Medium

### M1 — Guest PATCH adopts a party (and invite code) from another wedding
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/guests/[id]/route.ts:146-159` (PATCH)
- **Description**: The guest itself is correctly scoped (`currentGuest.weddingId !== weddingId` check at 134), but a `partyId` change fetches the target party with `db.party.findUnique({ where: { id: partyId } })` — no `weddingId` — and applies its `inviteCode` to the guest (and plus-one).
- **Reproduction**: As admin of A, `PATCH /api/admin/guests/{A-guest-id}` with `{ partyId: "<B-party-id>" }` → the guest is moved onto B's party and inherits B's invite code.
- **Impact**: Corrupts the guest's party/invite routing; leaks wedding B's invite code to wedding A.
- **Fix**: `db.party.findFirst({ where: { id: partyId, weddingId } })`; 404 if not found.

### M2 — RSVP `/verify` returns full Guest rows (PII / internal-field over-exposure)
- **Status**: Reported
- **Location**: `apps/web/app/api/rsvp/verify/route.ts:30-41` (also `update-info:59-63`, `events/rsvp/verify`)
- **Description**: `db.guest.findMany({ where: { inviteCode, weddingId } })` with no `select` returns every column — `clerkUserId`, internal flags (`list`, `side`, `family`, `numberOfResends`, `physicalInviteSent`, …) — to anyone with the code. The server action `verifyInviteCode` correctly narrows via `RSVP_GUEST_SELECT`; this REST route does not.
- **Reproduction**: `GET /api/rsvp/verify?code=<valid>` and inspect the JSON.
- **Impact**: Excessive PII/internal disclosure; aids enumeration & account-linking.
- **Fix**: Apply an explicit `select` mirroring `RSVP_GUEST_SELECT`.

### M3 — Registry claim/unclaim authenticated only by claimant email
- **Status**: Reported
- **Location**: `apps/web/app/api/registry/claim/route.ts:122-152` (DELETE)
- **Description**: The claim race itself is handled correctly (conditional `updateMany` gated on `result.count`). But unclaim only matches `claimedByEmail = email.toLowerCase()` — an attacker-supplied value. Whoever knows/guesses a claimant's email can release their claim. Endpoint is public and unthrottled by design.
- **Reproduction**: `DELETE /api/registry/claim` with `{ itemId, email: "victim@example.com" }` → claim cleared; re-claimable.
- **Impact**: Claim griefing/takeover; registry "who's giving what" integrity broken.
- **Fix**: Issue a per-claim secret token returned only to the claimant and require it for release (or email-verified ownership); add rate limiting.

### M4 — Unauthenticated guest-photo save accepts an arbitrary URL
- **Status**: Reported
- **Location**: `apps/web/lib/uploadthing.ts:67-78`, `apps/web/app/[slug]/(public)/photos/actions.ts:6-26`
- **Description**: `guestPhotoUploader` middleware returns `{}` ("no auth required" by design). The companion `saveGuestPhoto(url, uploaderName)` accepts an arbitrary `url` string with no validation (no Zod, no host check, no length cap) and writes a `guestPhoto` row with `isVisible: true` unconditionally. `GET /api/guest-photos` serves all visible photos.
- **Reproduction**: Call `saveGuestPhoto("https://evil.example/x.jpg", "…")` → row inserted, visible to all visitors. Separately, hammer the uploader to burn storage quota.
- **Impact**: Gallery defacement / arbitrary-URL injection into public content; storage-cost abuse; unmoderated content shown by default.
- **Fix**: Validate `url` against the UploadThing host with Zod; cap `uploaderName`; default `isVisible: false` pending moderation; rate-limit / token the uploader.

### M5 — `merge-guests` deletes the source's plus-ones via cascade
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/guests/[id]/merge/route.ts:52-116`; schema cascade `schema.prisma:291`
- **Description**: `source`/`target` are read with `Promise.all` **before** the `$transaction`, so the existence check races concurrent mutations. Plus-ones of the source are not re-pointed — the code relies on `primaryGuestId … onDelete: Cascade`, which **deletes** them when the source is deleted rather than moving them to the target.
- **Reproduction**: Merge guest A (who has plus-one P) into B → P is deleted, not moved.
- **Impact**: Plus-ones vanish on merge; concurrent RSVP writes to the source can be lost; headcount/seating drift.
- **Fix**: Move existence reads inside the transaction; explicitly re-point source plus-ones (`primaryGuestId = target`) instead of relying on cascade.

### M6 — iCal late-evening event with no end time produces DTEND before DTSTART
- **Status**: Reported
- **Location**: `apps/web/lib/calendar/generate-ics.ts:52-58, 98-107`
- **Description**: With a `start_time` but no `end_time`, the end is `addTwoHours(startTime)` which wraps via `% 24`, while the DTEND date stays the single-day `event_date`. For `23:00`, DTEND becomes `…T010000` on the *same* day — 22 hours before DTSTART.
- **Reproduction**: Event 2026-07-30, start `23:00`, no end → DTSTART `20260730T230000`, DTEND `20260730T010000`.
- **Impact**: Calendar clients reject/mis-render the event for any party starting ≥ 22:00.
- **Fix**: When `addTwoHours` wraps past midnight, advance the end date by a day; or compute end as a real `start + 2h` timestamp.

### M7 — `toDateStr` uses local getters → event off-by-one day behind UTC
- **Status**: Reported
- **Location**: `apps/web/lib/calendar/date-utils.ts:2-8`; caller `calendar/page.tsx:87`
- **Description**: For `Date` input, `toDateStr` uses local `getFullYear/getMonth/getDate`, not UTC. Prisma `@db.Date` values are UTC-midnight `Date`s; in a zone behind UTC they read back one day earlier (documented hazard in `format-schedule-date.ts`).
- **Reproduction**: `TZ=America/Los_Angeles`, event `2026-07-30` arrives as `…T00:00:00.000Z` → `toDateStr` returns `"2026-07-29"`.
- **Impact**: Admin calendar buckets the event one day early for viewers behind UTC.
- **Fix**: Use `getUTCFullYear/getUTCMonth/getUTCDate` in the `Date` branch.

### M8 — RSVP-reminder cron dedupe is a non-atomic read-then-write race
- **Status**: Reported
- **Location**: `apps/web/app/api/cron/rsvp-reminders/route.ts:82-93` (read) and `196-199` (write)
- **Description**: The only per-day re-send guard is `schedule.lastRunAt`, read at the top and written after the whole guest loop. `reminderCount` is incremented but never used as a send filter. Two overlapping invocations (Vercel retry, or a manual trigger racing the scheduled run) both pass the check before either writes → every pending guest emailed twice.
- **Reproduction**: Trigger the cron twice in quick succession on a matching day.
- **Impact**: Duplicate reminder emails; inflated `reminderCount`.
- **Fix**: Compare-and-set the schedule via `updateMany` with the prior `lastRunAt` in the `where` and only proceed if a row updated; or filter the send query on `lastReminderSentAt`.

### M9 — Summary crons inject unescaped guest/couple data into HTML email
- **Status**: Reported
- **Location**: `apps/web/app/api/cron/admin-summary/route.ts:109-126`; `apps/web/app/api/cron/platform-summary/route.ts:84-93`
- **Description**: Both build HTML by string-interpolating DB values with no escaping (`<td>${name}</td>`, `${w.coupleName}`, `<code>${w.slug}</code>`). Guest names and couple names are user-controllable.
- **Reproduction**: A guest `firstName` of `<a href="http://evil">click</a>` renders live in the next admin-summary email.
- **Impact**: HTML/link injection into trusted admin/platform emails (phishing, layout breakage).
- **Fix**: HTML-escape all interpolated DB values (small `escapeHtml` helper).

### M10 — Stripe partial refund flips the whole gift to "refunded"
- **Status**: Reported
- **Location**: `apps/web/app/api/webhooks/stripe/route.ts:1011-1084` (`handleChargeRefunded`)
- **Description**: On `charge.refunded` it sets `status: "refunded"` and ignores `charge.amount_refunded` / `charge.refunded`. Totals count only `completed`, so a partial refund removes the gift's **entire** amount from totals.
- **Reproduction**: $200 gift, $50 partial refund → gift flips to "refunded"; totals drop by $200.
- **Impact**: Understated totals on partial refunds; refunded amount never persisted.
- **Fix**: Store `amountRefundedCents`; set "refunded" only when `charge.refunded === true`, else "partially_refunded"; compute totals as `amountCents - amountRefundedCents`.

---

## Low

### L1 — Gift PATCH links a gift to a guest from another wedding
- **Status**: Reported
- **Location**: `apps/web/app/api/admin/gifts/route.ts:134-135` (PATCH)
- **Description**: The gift is verified against `weddingId`, but a body-supplied `guestId` is written without verifying that guest belongs to the same wedding.
- **Impact**: Dangling cross-tenant reference; foreign guest name/email surfaces in wedding A's admin view; donation mis-attribution.
- **Fix**: Validate `db.guest.findFirst({ where: { id: guestId, weddingId } })` before assigning.

### L2 — Send-then-flag is non-atomic across all email senders
- **Status**: Reported
- **Location**: `cron/rsvp-reminders/route.ts:163-186`; same pattern in `bulk-send-email`, `events/[id]/send-invites`, `bulk-send-calendar-invites`, `send-activities-email`
- **Description**: Every sender does `sendEmail(...)` then a separate `db.*.update(...)` for the "sent" counter, with no transaction. A post-send DB failure leaves the email delivered but the flag unrecorded → possible duplicate next run or inaccurate audit.
- **Fix**: Record an idempotency key in `email_logs` and check before sending, or make the counter update durable/retriable.

### L3 — `CRON_SECRET` optional → misconfig silently disables all crons
- **Status**: Reported
- **Location**: cron route guards (`rsvp-reminders:27`, `admin-summary:28`, `platform-summary:22`); `env.ts:27` (`CRON_SECRET: z.string().optional()`)
- **Description**: Guards are correctly fail-closed, but `CRON_SECRET` is optional and `vercel.json` sets no auth headers. Deployed without it, every cron returns 401 and silently does nothing — no reminders/summaries ever sent, no alert.
- **Fix**: Make `CRON_SECRET` required in `env.ts` (or assert at module load for cron routes).

### L4 — Self-registration name-match can hijack an existing guest's RSVP
- **Status**: Reported
- **Location**: `apps/web/app/api/events/rsvp/public/route.ts:120-137`
- **Description**: In `mode:"name"`, an existing guest is matched by case-insensitive first/last name only (no email/identity), then RSVP'd as that guest. Two real people sharing a name collapse into one; a stranger knowing a guest's name can flip their per-event RSVP.
- **Fix**: Don't auto-bind by name alone for writes — require the invite code for existing guests, or create a distinct self-registered record.

### L5 — `events/rsvp/{submit,verify}` lack Zod validation
- **Status**: Reported
- **Location**: `apps/web/app/api/events/rsvp/submit/route.ts:21-30`, `apps/web/app/api/events/rsvp/verify/route.ts:14-24`
- **Description**: These two parse the body/query manually (truthiness + `typeof attending`) with no Zod, unlike sibling routes. `eventId` goes straight to Prisma; no length bound on `inviteCode`, no UUID shape check. Object-level auth is otherwise OK (matched by code + `weddingId`).
- **Fix**: Add a Zod schema (`inviteCode` bounded, `eventId` `z.string().uuid()`, `attending` boolean).

### L6 — Sanitizer allows `target` without forcing `rel`
- **Status**: Reported
- **Location**: `apps/web/lib/sanitize-html.ts:39`
- **Description**: `allowedAttributes.a` includes `target` but doesn't force `rel="noopener noreferrer"`, so an admin-authored `target="_blank"` link leaves the opened tab able to access `window.opener`. (XSS core is fine — `javascript:`/`data:`/`on*` are stripped by defaults.)
- **Fix**: `transformTags` to force `rel="noopener noreferrer"` on anchors (or drop `target`).

### L7 — Email-log records only the first recipient of multi-recipient sends
- **Status**: Reported
- **Location**: `apps/web/lib/email/email-log.ts:52-54`; callers admin-summary & hotel notification (array `to:`)
- **Description**: `buildEmailLogData` stores `Array.isArray(to) ? to[0] : to`, so multi-recipient sends log only `to[0]`. These sends also use `to:` (not `bcc:`), exposing the internal recipient list in the To header.
- **Fix**: Store the full recipient list; use `bcc` if external recipients can appear.

### L8 — Activity-interest writes can duplicate (no unique constraint / transaction)
- **Status**: Reported
- **Location**: `apps/web/app/[slug]/(public)/things-to-do/actions.ts:197-236`; schema `133-150`
- **Description**: Check-then-write with no unique constraint on `(guestId, activityId)` and no transaction; two concurrent submissions both insert. Deletes/updates use `inviteCode` without `weddingId`.
- **Fix**: Add a unique constraint on `(guestId, activityId)` and upsert; scope by `weddingId`; wrap the loop in a transaction.

### L9 — Public-RSVP capacity reads happen outside the `FOR UPDATE` lock
- **Status**: Reported
- **Location**: `apps/web/app/api/events/rsvp/public/route.ts:120-188` (pre-tx reads) vs `200-255` (tx)
- **Description**: The event row is correctly locked and counted inside the tx, but the `existing`/additional-guest matching and `partyExistingIds` (excluded from the count) are computed pre-lock. A concurrent RSVP creating a matching plus-one in the gap can make the count off by a party.
- **Fix**: Move the guest-matching reads inside the locked transaction.

### L10 — `event-rsvp-breakdown.toTimeString` returns full ISO (latent contract bug)
- **Status**: Reported
- **Location**: `apps/web/lib/db/admin/event-rsvp-breakdown.ts:79-82, 152-153`
- **Description**: `toTimeString` returns `value.toISOString()` for `Date` inputs, populating `startTime`/`endTime` as full ISO. The sole current consumer (`events/[id]/page.tsx:26`) defensively strips the `T…`, so no wrong output today — but the field is typed as a plain time string and any new consumer that splits on `":"` will hit the same `parseInt("1970-01-01T18") = 1970` bug as H5.
- **Fix**: Return `toISOString().slice(11,16)` ("HH:MM") to make the contract consistent.

---

## What was checked and found correct (no action)

- The `[id]` admin **API routes** for events, photos, templates, guest-photos,
  seating-charts/tables, photo placements, events/invites, and the guests
  bulk/set-rsvp/merge/email-log/calendar routes are correctly `weddingId`-scoped
  and admin-gated.
- Raw SQL is safe: `seed.ts:74` is a static TRUNCATE; `settings/actions.ts:35`
  and `rsvp/public/route.ts:203` use parameterized Prisma tagged-template
  binding (`${weddingId}::uuid`), not string interpolation. **No SQL injection.**
- `/api/e2e/reset` is well-gated (preview/local-only + prod-project-ref refusal
  + `E2E_RESET_SECRET`).
- Cron auth is fail-closed (the only downside is the silent-disable of L3).
- `headcount.ts`, `event-capacity.ts`, `rsvp-stats.ts`/`rsvp-tally.ts`,
  `format-schedule-date.ts` (UTC-correct), `parse-date.ts`,
  `events-visibility.ts`, and the audited React hooks are sound.
- The public-registry **claim** race is correctly handled with a conditional
  `updateMany` (only the unclaim-auth weakness M3 remains).
- `submitMultiGuestRSVP` correctly constrains writes to guests verified to be in
  the invite code's party.

---

_Methodology: parallel read-only review across six risk dimensions
(multi-tenancy/authz, public/guest endpoints, payments, cron/email, data-layer
concurrency, application logic), with the Critical/High access-control and
guest-facing items independently re-traced against the source (marked
**Verified**)._
