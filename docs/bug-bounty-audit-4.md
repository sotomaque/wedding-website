# Bug Bounty Audit — Round 4 — 2026-06-24

Fourth sweep after rounds 1–3 merged. This round targets the **authentication/
authorization model itself**, SSRF / unsafe-URL handling, open-redirect & the
Stripe webhook's tenant resolution, read-route over-exposure & mass-assignment,
money/email idempotency, and remaining concurrency races.

Status legend: **Verified** = code path read end-to-end this round.
**Reported** = agent-traced with cited code, high confidence.

> The headline this round is **two Critical auth bypasses**: email-based
> authorization (both admin and guest) trusts `emailAddresses[0]` with **no
> verification check**, so an attacker can add an unverified copy of a victim's
> email to their Clerk account and match a pre-seeded admin/guest row.

## Severity summary (23 findings)

| ID | Severity | Status | Title |
|----|----------|--------|-------|
| C1 | Critical | Verified | `isAdmin` trusts an unverified Clerk email → admin/superadmin takeover |
| C2 | Critical | Verified | Guest auto-link trusts an unverified Clerk email → guest identity takeover |
| H1 | High | Verified | Email-based authZ uses `emailAddresses[0]`, not the verified primary (root cause) |
| H2 | High | Verified | Unauthenticated SSRF: guest-photo download server-fetches an attacker URL |
| H3 | High | Verified | Stripe webhook attributes gifts cross-tenant (unscoped guest match + default-wedding fallback) |
| H4 | High | Verified | `/api/rsvp/update-info` returns full Guest rows (clerkUserId, notes) to an invite-code caller |
| H5 | High | Verified | Gift thank-you email send is non-atomic check-then-set → duplicate donor emails |
| H6 | High | Verified | `removeAdmin` last-owner guard is a check-then-act race → can leave 0 owners |
| M1 | Medium | Reported | Webhook out-of-order `pending`/`failed` overwrites `completed`/`refunded` |
| M2 | Medium | Reported | Webhook handler errors → 500 → infinite Stripe retry on deterministic failures |
| M3 | Medium | Verified | Platform-summary cron, platform-admin page & AI tools sum failed/refunded + mixed currency |
| M4 | Medium | Verified | Webhook admin gift-notification logged as `gift_thank_you` (audit corruption) |
| M5 | Medium | Verified | `invite_code` cookie set without `secure`/`sameSite` (party access credential) |
| M6 | Medium | Verified | `_max(order)+1` create races produce duplicate display/sort orders across all ordered resources |
| M7 | Medium | Verified | `createWedding` provisioning is non-atomic → orphaned/owner-less weddings |
| L1 | Low | Verified | `/api/admin(*)` not explicitly in the middleware protected-route matcher (hardening) |
| L2 | Low | Verified | Event OG-image route server-fetches an unvalidated (admin-set) URL |
| L3 | Low | Verified | Registry `stripeUrl`/`productUrl` not scheme-validated (`javascript:` link) |
| L4 | Low | Verified | Admin event PATCH bypasses Zod (destructure-allowlisted but unvalidated types) |
| L5 | Low | Verified | Seating-table `_max(tableNumber)+1` race → spurious 500 |
| L6 | Low | Verified | `inviteAdmin` findFirst-then-create → P2002 surfaced as wrong message |
| L7 | Low | Verified | `createWedding` slug validate-then-create TOCTOU → generic error to the loser |

---

## Critical

### C1 — `isAdmin` trusts an unverified Clerk email
- **Status**: Verified
- **Location**: `apps/web/lib/auth/admin.ts:28-47`
- **Description**: `isAdmin` reads `user.emailAddresses[0]?.emailAddress` and matches `wedding_admins` via `OR: [{ email: userEmail }, { clerkUserId }]`, and matches `ADMIN_EMAILS` (superadmin). It never checks the email is **verified** or the user's **primary**. `inviteAdmin` (`settings/actions.ts`) and `onboarding` pre-create `wedding_admins` rows keyed on email with null `clerkUserId`. Clerk lets a user add an email address that is still **unverified**, and it appears in `emailAddresses`.
- **Reproduction**: Owner invites `victim@example.com` as owner → a `wedding_admins` row exists with that email. Attacker signs up to Clerk, **adds** `victim@example.com` as an (unverified) email, hits `/[slug]/admin` → `isAdmin` matches by email → full admin (or superadmin if the email is in `ADMIN_EMAILS`).
- **Impact**: Per-wedding (or platform) admin takeover: guest PII, gifts, email send, admin management.
- **Fix**: Resolve the **verified primary** email and use only that for any authZ match: `user.emailAddresses.find(e => e.id === user.primaryEmailAddressId && e.verification?.status === "verified")?.emailAddress`. Centralize as a helper and use everywhere (C1/C2/H1).

### C2 — Guest auto-link trusts an unverified Clerk email
- **Status**: Verified
- **Location**: `apps/web/lib/auth/guest-session.ts:59-83` and `linkClerkUserToGuest` `:174-200`
- **Description**: `getGuestParty` matches `user.emailAddresses[0]` against `guest.email`, then **writes `clerkUserId` onto that guest** and returns the full party. No verification/primary check. Guest lists contain known invitee emails.
- **Reproduction**: Attacker registers Clerk, adds an unverified copy of a known invitee's email, loads any page that calls `getGuestParty` → their `clerkUserId` is bound to the victim guest and the victim's party PII/RSVP is returned.
- **Impact**: Guest identity takeover; PII disclosure; ability to alter another party's RSVP; can lock the real guest out.
- **Fix**: Same verified-primary-email resolution before any email-based match/auto-link.

---

## High

### H1 — Email-based authZ uses `emailAddresses[0]`, not the verified primary
- **Status**: Verified
- **Location**: `lib/auth/admin.ts:28`, `lib/auth/guest-session.ts:59,174`, `lib/uploadthing.ts:24`, `app/dashboard/page.tsx:11`, `app/platform-admin/layout.tsx:14`, `app/platform-admin/actions.ts:13`, `app/onboarding/actions.ts:76`, `app/[slug]/admin/settings/actions.ts:407`
- **Description**: Every email-keyed authorization (and the "cannot remove yourself" guard) uses `emailAddresses[0]` — an unordered array that is neither guaranteed primary nor verified. This is the shared root cause of C1/C2 and must be fixed at every site.
- **Fix**: A single `getVerifiedPrimaryEmail(user)` helper used everywhere; return unauthorized when there is no verified primary.

### H2 — Unauthenticated SSRF via guest-photo download
- **Status**: Verified
- **Location**: `apps/web/app/api/admin/guest-photos/download/route.ts:39` (`fetch(photo.url)`); URL written by the public `saveGuestPhoto` (`app/[slug]/(public)/photos/actions.ts:6-19`, uploader middleware is open, `lib/uploadthing.ts:73-75`)
- **Description**: `saveGuestPhoto(url, …)` is a **public** action that stores an arbitrary `url` with no scheme/host validation. The admin download route then does `fetch(photo.url)` server-side and zips the body. An anonymous user can plant `http://169.254.169.254/…` (cloud metadata), `http://localhost:…`, or an internal URL; when an admin downloads, the server fetches it and embeds the response in the ZIP.
- **Impact**: Unauthenticated SSRF to cloud-metadata/internal services, credential theft, internal port scan, exfiltration via the downloaded ZIP.
- **Fix**: Validate `url` at write time (require `https:` + exact UploadThing host); re-validate in the download route and block private/link-local ranges; ideally store only the UploadThing key and rebuild the URL server-side.

### H3 — Stripe webhook attributes gifts cross-tenant
- **Status**: Verified
- **Location**: `apps/web/app/api/webhooks/stripe/route.ts:18-31` (`resolveGiftWeddingId`), `:71-186` (`findGuest`)
- **Description**: The webhook is the only place a gift's `weddingId` is set. `findGuest` matches by email/name/phone **with no `weddingId` filter** (matches guests across all tenants), and unmatched charges fall back to a hardcoded `DEFAULT_WEDDING_SLUG` wedding. No authoritative `weddingId` is carried in Stripe metadata (no app-side checkout/payment-link creation sets it).
- **Reproduction**: A donor to wedding B whose email/name/phone-suffix coincides with a guest in wedding A → the gift, donor PII, and notification emails land on **wedding A**. Unmatched donations all attribute to the default wedding.
- **Impact**: Cross-tenant financial/PII misattribution; wrong admins emailed; wrong dashboards.
- **Fix**: Carry an authoritative `weddingId` in Stripe object metadata at payment-link creation and read it from the verified event; scope `findGuest` by it; remove the default-wedding fallback (park unattributable charges).

### H4 — `/api/rsvp/update-info` returns full Guest rows
- **Status**: Verified
- **Location**: `apps/web/app/api/rsvp/update-info/route.ts:58-63`
- **Description**: After the update, it re-fetches `db.guest.findMany({ where: { inviteCode, weddingId } })` with **no `select`** and returns every column — `clerkUserId`, private admin `notes`, `bridalPartyRole`, `side`, `list`, `family`, and all email-tracking flags — to an unauthenticated invite-code-only caller. (Distinct from round-1's `/api/rsvp/verify`.)
- **Fix**: Return an explicit `select` allowlist (reuse `RSVP_GUEST_SELECT` from `rsvp/actions.ts`).

### H5 — Gift thank-you email send is non-atomic check-then-set
- **Status**: Verified
- **Location**: `apps/web/app/api/admin/gifts/route.ts:143-160`; no dedup in `lib/email/email-log.ts:70-80`
- **Description**: PATCH reads `existing`, updates the flag, then sends the thank-you only if `!existing.thankYouEmailSent` — using the pre-read snapshot, no transaction. Two concurrent PATCHes both observe `false`, both send. `recordEmailLog` has no dedup.
- **Fix**: Gate atomically: `updateMany({ where: { id, thankYouEmailSent: false }, data: { thankYouEmailSent: true } })` and only send when `count === 1`.

### H6 — `removeAdmin` last-owner guard is a check-then-act race
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/admin/settings/actions.ts:414-426`
- **Description**: The round-3 last-owner guard counts owners then deletes in **separate, unlocked** statements. Two concurrent `removeAdmin` calls targeting the two owners of a 2-owner wedding both read `count = 2`, both pass `> 1`, both delete → **0 owners** (the exact state the guard prevents).
- **Fix**: Do the count + delete in one `$transaction` with `SELECT … FOR UPDATE` on the owner rows, or a conditional `deleteMany` that re-checks the owner count atomically.

---

## Medium

### M1 — Webhook out-of-order events overwrite terminal gift status
- **Status**: Reported
- **Location**: `stripe/route.ts:919-941` (`handleChargePending`), `:714-738` (`handleChargeFailed`)
- **Description**: Both set `status` unconditionally on an existing gift (found by the **non-unique** `stripePaymentIntentId`). A delayed/replayed `charge.pending`/`charge.failed` after a `completed`/`refunded` flips the gift back, silently dropping it from completed-only totals. Stripe doesn't guarantee ordering.
- **Fix**: Only allow forward transitions; add `@@unique` on `stripePaymentIntentId`; consider the event `created` timestamp.

### M2 — Webhook 500 → infinite Stripe retry on deterministic failures
- **Status**: Reported
- **Location**: `stripe/route.ts` handlers `throw` → outer catch returns 500 (`:1236-1248`); `resolveGiftWeddingId` throws when no default wedding (`:28-29`)
- **Description**: A deterministic failure (missing default wedding, persistent unique conflict) returns 500 on every retry for ~3 days, never recording the gift, and can trip Stripe's auto-disable.
- **Fix**: Distinguish transient (500) from permanent (log + 200) failures; make creates idempotent against unique `stripeChargeId`; don't throw on missing default wedding.

### M3 — Unfiltered/mixed-currency gift revenue in three more places
- **Status**: Verified
- **Location**: `app/api/cron/platform-summary/route.ts:57-61`, `app/platform-admin/page.tsx:40-42`, `lib/ai/tools/wedding-tools.ts:229-254` & `:296-322`
- **Description**: All do `gift.aggregate({ _sum: amountCents })` with **no `status` filter** (counting failed/refunded/pending) and format as USD across mixed currencies — distinct files from round-1's `getGiftStats`. The AI assistant and platform dashboards report inflated revenue.
- **Fix**: Filter `status: "completed"` and group/format per currency (mirror the fixed `getGiftStats`).

### M4 — Admin gift-notification logged as `gift_thank_you`
- **Status**: Verified
- **Location**: `stripe/route.ts:330-336`
- **Description**: The webhook sends the **admin** `gift_notification` template but records the email-log row as `type: "gift_thank_you"`. Audit corruption; if anything infers "donor thanked" from that row it would suppress the real thank-you.
- **Fix**: Log as `gift_notification`.

### M5 — `invite_code` cookie missing `secure`/`sameSite`
- **Status**: Verified
- **Location**: `apps/web/app/[slug]/(public)/things-to-do/actions.ts:371-376`
- **Description**: The 1-year `invite_code` cookie (a party access credential) is `httpOnly` but lacks `secure` and `sameSite` (the locale cookie sets `sameSite: "lax"`).
- **Fix**: Add `secure: NODE_ENV === "production"` and `sameSite: "lax"`.

### M6 — `_max(order)+1` create races duplicate orderings
- **Status**: Verified
- **Location**: registry/hotels/activities/vendors/todos `actions.ts` creates, `api/admin/events/route.ts`, `api/admin/photos/route.ts`, `photos/placements/route.ts`
- **Description**: Each create reads `_max(displayOrder|sortOrder)` then writes `+1` with no transaction/lock and no unique constraint on the order column. Concurrent creates collide → duplicate orders → non-deterministic public ordering.
- **Fix**: Allocate inside a `$transaction` with a `FOR UPDATE` lock (mirror the `designConfig` pattern), or a DB-side expression, or `@@unique` + retry.

### M7 — `createWedding` provisioning is non-atomic
- **Status**: Verified
- **Location**: `apps/web/app/onboarding/actions.ts:84-210`
- **Description**: `wedding.create` → `weddingAdmin.create` → events/templates/content `createMany` run as separate writes with no `$transaction`. A failure after step 1 leaves an orphaned/owner-less wedding and burns the slug.
- **Fix**: Wrap provisioning in one `db.$transaction`; send emails post-commit.

---

## Low

- **L1** — `proxy.ts` `isProtectedRoute` covers `/api/admin` only incidentally (via `/(.*)/admin(.*)`); add explicit `/api/admin(.*)` + `/api/platform-admin(.*)` for defense-in-depth (`proxy.ts:46-51`).
- **L2** — Event OG-image route (`events/[token]/opengraph-image.tsx:41-60`) server-fetches `event.imageUrl` (admin-set) with `http` allowed and no host allowlist (5s/20MB caps present).
- **L3** — Registry `stripeUrl`/`productUrl` saved with no scheme check (`registry/actions.ts:84-86`) and rendered into `href` (`registry-card.tsx:165,186`); a `javascript:` value becomes a clickable link. (`serviceLink` validates; registry doesn't.)
- **L4** — Admin event PATCH (`api/admin/events/[id]/route.ts:93-153`) bypasses Zod (destructure-allowlisted, so not mass-assignment, but unvalidated types).
- **L5** — Seating-table create `_max(tableNumber)+1` race throws P2002 → spurious 500 (`api/admin/seating-charts/[id]/tables/route.ts:50-70`).
- **L6** — `inviteAdmin` findFirst-then-create → concurrent P2002 surfaced as "Failed to invite" instead of "already an admin" (`settings/actions.ts:362-375`).
- **L7** — `createWedding` slug validate-then-create TOCTOU → loser gets a generic error instead of "URL taken" (`onboarding/actions.ts:44-50,79-84`).

---

## Checked and found correct (no action)

- **Stripe signature** IS verified on the **raw** body (`request.text()` → `constructEvent`), and amounts come from the Stripe-confirmed charge, not client input.
- **Open redirect**: no `redirect_url`/`returnTo`/`next`/`callbackUrl` consumed anywhere; sign-in uses a hardcoded `/dashboard`; the `proxy.ts` custom-domain redirect prefixes `/${slug}` so a `//evil.com` pathname stays same-origin and the host is fixed to `NEXT_PUBLIC_APP_URL`.
- **next/image `remotePatterns`** is locked to `https://utfs.io/f/**` (not `**`) — no broad image SSRF.
- `getFaviconUrl` builds a Google favicon URL client-side from the parsed hostname; the server never fetches the vendor URL. Geoapify autocomplete runs in the browser with a public key.
- Admin guest/gift PATCH and the RSVP submit/self-register paths use explicit field allowlists (destructure or typed `Prisma.*CreateInput`), not raw body spreads — no mass-assignment.
- Reorder actions and `registry/claim` are `$transaction`-wrapped / conditional-`updateMany` and race-safe.

---

_Methodology: six parallel read-only hunters over the auth model, SSRF/URL
handling, open-redirect + Stripe webhook, read-route disclosure + mass-assignment,
money/email idempotency, and concurrency. The Critical/High items were personally
re-traced against source (**Verified**); the rest are agent-traced (**Reported**)._
