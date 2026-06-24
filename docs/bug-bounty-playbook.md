# Bug-Bounty / Draft-PR / PR-per-fix Playbook

A reusable prompt + workflow for driving a Claude Code instance into
"audit a codebase, open a draft PR with the findings spec, then ship one
focused PR per verified fix" mode. Paste the **Prompt** section into a fresh
Claude Code session. The rest documents the workflow it encodes.

---

## Prompt (copy-paste this)

> **Mode: security/correctness bug-bounty with draft-PR spec + one PR per fix.**
>
> Run a thorough, multi-pass bug-bounty on this repository. Work in rounds; each
> round follows the same shape:
>
> **1. Fan out parallel read-only hunters.** Spawn ~6 subagents at once, each
> owning ONE risk dimension, each read-only (no edits), each returning structured
> findings. Pick dimensions to fit the stack; for a multi-tenant web app the
> high-yield set is: (a) authentication/authorization model + session/cookies;
> (b) tenant isolation / IDOR / object-level access on every mutating route &
> server action; (c) public/unauthenticated endpoints & input validation;
> (d) payments/money correctness & webhook idempotency; (e) background jobs,
> email/templating & injection; (f) data-layer concurrency (races, missing
> transactions); (g) SSRF / unsafe user-supplied URLs / open redirect;
> (h) read-route over-exposure & mass-assignment; (i) client/UI correctness
> (date/timezone, optimistic state, double-submit, list-key/selection bugs).
> Tell each agent what prior rounds already FIXED or DOCUMENTED so it finds NEW
> bugs, and require this output per finding: `### title`, **Severity**
> (Critical/High/Medium/Low), **Status** (Verified = read the full path |
> Reported = cited, not re-traced), **Location** `path:line`, **Description**
> (cite code), **Reproduction**, **Impact**, **Suggested fix**.
>
> **2. Personally re-verify the Critical/High items** before writing them up —
> read the actual code path. Only label something **Verified** if you read it.
> Downgrade or correct agent claims that don't hold (this matters: a "minimal
> fix" suggested by an agent can be wrong — e.g. a unique constraint that breaks
> a legitimate shared-value design).
>
> **3. Write the spec doc** at `docs/bug-bounty-audit-N.md`: root-cause themes,
> a severity-sorted summary table, then per-finding detail (repro + impact + fix
> + Verified/Reported), and a "checked and found correct (no action)" section so
> the reader sees what was cleared. Don't repeat findings already shipped in
> prior rounds' docs.
>
> **4. Open a DRAFT PR** containing only that doc (no code), on a branch like
> `claude/bug-bounty-audit-N`, off the default branch. The PR body summarizes
> the tally and headline findings and offers to proceed with per-fix PRs.
>
> **5. After review, ship ONE PR per verified fix.** For each: branch off the
> latest default branch (`claude/fix-<slug>`), make the minimal change, run the
> repo's lint + typecheck + relevant tests until green, add/adjust tests when the
> fix is behavioral, commit with a clear message that names the finding, push,
> open the PR, and check the item off via a comment on the draft spec PR. Keep
> PRs independent (each off the default branch) so they merge in any order.
>
> **Guardrails:**
> - Never push a schema migration (or any change) that could break production or
>   fail on existing data. If a "fix" needs a DB migration, data backfill, or a
>   product decision, STOP and flag it with the safe (additive, non-breaking)
>   alternative instead of forcing it. Verify the premise first — e.g. before
>   adding a unique constraint, confirm the column isn't intentionally
>   non-unique.
> - Re-verify a **Reported** item against current code before fixing it.
> - Respect the repo's conventions (package manager, formatter, commit/PR
>   norms, branch policy). Read the contributor/agent guide if present.
> - When a fix touches a tested module, update the test and run it.
> - Surface honestly: if tests fail, say so; if you skipped something, say so.
>
> Start with round 1: fan out the hunters now.

---

## Recurring high-yield patterns (what to look for)

These surfaced repeatedly in a Next.js + Prisma + Clerk multi-tenant app and
generalize well:

1. **Registry-class IDOR.** A handler/action authorizes the *caller* (`isAdmin`)
   but then mutates by primary key only — `where: { id }` with no tenant scope —
   letting an admin of tenant A act on tenant B's row. Fix shape:
   `updateMany/deleteMany({ where: { id, tenantId } })` + count check, or
   `findFirst({ where: { id, tenantId } })` before acting.
2. **Server Actions aren't protected by middleware.** Next.js Server Actions are
   POST endpoints dispatched by id; route/middleware auth is not a reliable
   boundary. Every mutating action must authorize itself.
3. **Trusting client-supplied identity for the tenant/user.** An action that
   takes a `tenantId`/`weddingId` argument and only checks "logged in"; a context
   resolver that trusts an inbound header the app never strips; email-based authz
   that trusts an **unverified** identity-provider email or `emails[0]` instead
   of the verified primary.
4. **Unescaped templating.** A `{{var}}` engine that splices user data into HTML
   email/markup with no escaping → stored injection. Escape on output; allow-list
   the few intentionally-raw values.
5. **Money correctness.** Summing across currencies as one integer; counting
   non-completed (failed/refunded/pending) rows in revenue; webhook idempotency
   via read-then-write with no unique key or event-id ledger; out-of-order events
   overwriting terminal status; non-atomic "email already sent" flags.
6. **SSRF / unsafe URLs.** Server-side `fetch()` of a user-supplied URL with no
   scheme/host allowlist (cloud-metadata, internal services); overly broad
   `next/image` remotePatterns; user URLs rendered into `href` without scheme
   validation (`javascript:`/`data:`).
7. **Concurrency.** `_max(order)+1` then create (duplicate orderings); check-then-
   act guards (`count` then delete; `findFirst` then create) that race; counters
   via `x = current + 1` instead of `{ increment: 1 }`; multi-step provisioning
   with no `$transaction`.
8. **Read over-exposure & mass-assignment.** GET/return paths sending full ORM
   rows (internal flags, auth ids, private notes) instead of a `select` allowlist;
   PATCH/POST building `data` from a raw body spread.
9. **Client correctness.** Tables keyed by row index instead of id (bulk actions
   hit wrong rows after re-fetch); `toISOString().slice(0,10)` date keys (off-by-
   one across timezones); optimistic actions that ignore the result (silent
   failure); missing in-flight guards (double-submit); editors reading a prop
   only once (external updates don't apply).

## Per-fix PR conventions that worked well

- One finding → one branch `claude/fix-<short-slug>` off the default branch.
- Gate every push on the repo's formatter + typecheck + touched tests; fix any
  test-mock breakage your change causes (don't weaken the assertion — extend the
  mock).
- Commit message names the finding id and what was wrong + the fix.
- Maintain a running checklist as a comment on the draft spec PR, updated in
  batches, linking each finding to its fix PR number.
- Keep PRs small and independent; note in the PR body which finding it closes.
