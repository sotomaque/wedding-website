# Template Default Content — Design

**Date:** 2026-06-07
**Status:** Draft for review

## Problem

A freshly onboarded wedding seeds the same template-agnostic content for every
template (`apps/web/app/onboarding/actions.ts`), and is created with
`templateId = null` (→ Classic). The story row is seeded as
`{ title: "Our Story", paragraphs: [] }` — a title with an empty body.

This produces two visible problems on the **Elegant** template:

1. **Empty section header.** `ElegantStorySection` gates on *title presence*
   (`if (!hasText && !content?.title) return null`), so the seeded title
   "Our Story" makes it render a bare heading with nothing underneath. Classic's
   `StorySection` gates on *body/photo presence* and hides the same empty
   content, which is why the bug only shows on Elegant.

2. **No default content, so the template looks empty.** The `seedFlavor` field
   on the template presets (`"classic"` / `"elegant"`) is defined but never
   read — a placeholder for the per-template seeder that was never built. As a
   result, Classic and Elegant have identical (empty) defaults and neither
   template demonstrates its sections out of the box.

Separately: the admin content editors already show **hardcoded** placeholder
hints (e.g. `StoryEditor` shows a full "coffee shop in Brooklyn" sample), but
those placeholders are not template-aware and are inconsistent with the public
render path, which shows nothing for the same empty body. The editor hints at
content the live site never renders.

A third, related gap: **RSVP is missing from the Elegant layout.** The Classic
layout ends with `rsvp`, but the Elegant layout
(`hero, welcome, story, schedule, wedding-party, travel-teaser, things-to-do,
gallery, registry-teaser, faqs`) has no `rsvp` section at all, so Elegant sites
never show the RSVP call-to-action by default.

## Goals

- Per-template curated default copy for the **text** sections, so a couple
  sees populated, representative sections while building their site.
- A **single source of truth** for those defaults, consumed by both the public
  render fallback and the admin editor placeholders — so they can never drift.
- Never show fabricated sample copy to real guests on a **published** site.
- Add the RSVP section to the Elegant layout so it ships on both templates.
- Fix the empty "Our Story" header on Elegant.

## Non-goals

- Default content for **structured-list** sections (Wedding Party members, FAQ
  items) — they stay null-gated / blank-slate until the user adds entries.
- Default content for **data-table-backed** sections (Hotels, Registry items,
  Gallery photos) and any demo imagery.
- Writing demo content rows to the database. Defaults are resolved at read time;
  the DB only ever stores real user edits (keeps the model additive).

## Decisions (from brainstorming)

- **Mechanism: hybrid, no DB writes.** One defaults module feeds (a) the public
  render path as a fallback and (b) the admin editors as placeholders.
- **Scope: text sections only** — Hero, Welcome, Story, Details (Classic only),
  Schedule title, RSVP title.
- **Templates: both Classic and Elegant** get curated defaults.
- **Public fallback gated by `status`** (industry best practice):
  - **Draft** → public page renders defaults for empty sections, so the couple
    previews a fully-populated site.
  - **Published** → empty sections are **hidden**; guests see only real content.
  - **Editors** → always show the template defaults as placeholders.
- **Welcome behavior change (approved):** Welcome currently always renders a
  default message even when published. It will now follow the same rule — hidden
  when published and empty.
- **RSVP on Elegant (approved):** add `rsvp` to the Elegant layout.

## Architecture

### 1. Source of truth — `apps/web/lib/template-content-defaults.ts`

Per-template default copy keyed by `template.seedFlavor` (this finally gives the
field the purpose its comment promises).

```ts
export interface TemplateContentDefaults {
  hero?: { title?: string; location?: string }
  welcome?: { title?: string; message?: string }
  story?: { title?: string; bodyHtml?: string }
  details?: { title?: string }   // Classic layout only
  schedule?: { title?: string }
  rsvp?: { title?: string }
}

export const TEMPLATE_CONTENT_DEFAULTS: Record<string, TemplateContentDefaults>

/** Defaults for a seedFlavor; falls back to the classic defaults for unknown. */
export function getTemplateContentDefaults(seedFlavor: string): TemplateContentDefaults
```

### 2. Resolution helper

A pure helper resolves the content a section should render, given the DB content,
the template defaults, and whether the wedding is a draft:

```
effective(field) = DB value (if non-empty)
                 → template default (if status === "draft")
                 → undefined  (published + empty → section hides)
```

"Non-empty" is per-field: a trimmed non-empty string for titles/messages, and
`bodyHtml` / `paragraphs.length > 0` for the story body (matching the existing
`hasText` checks).

The `isDraft` flag derives from `settings.status === "draft"` in
`app/[slug]/(public)/page.tsx`, which already loads `settings`.

### 3. Render path — `app/[slug]/(public)/page.tsx` + section components

- `page.tsx` computes `defaults = getTemplateContentDefaults(template.seedFlavor)`
  and `isDraft`, then passes resolved content into each text section.
- **Story gating fix:** `ElegantStorySection` changes from title-presence to
  body-presence gating (matching `StorySection`). With resolution applied:
  - draft + empty story → renders the default story body (no more bare header),
  - published + empty story → hidden.
- **Welcome:** `WelcomeSection` stops hardcoding `DEFAULT_TITLE` /
  `DEFAULT_MESSAGE`; it receives resolved content and renders only when it has a
  message (default in draft, real when published, hidden if published + empty).
- **RSVP, titles:** RSVP and section titles resolve their default titles the same
  way; RSVP remains always-shown (functional CTA), only its title falls back.

### 4. Editor placeholders — `components/customization/content-editors.tsx`

The text editors (`HeroEditor`, `StoryEditor`, `DetailsEditor`, `ScheduleEditor`,
`RsvpEditor`, `WelcomeEditor`) receive the active template's defaults and use
them as `placeholder` text, replacing today's hardcoded inline strings. The
editors already accept the data they need except the template defaults; the
content page / inline customizer passes `wedding.templateId` →
`getTemplateContentDefaults(getTemplatePreset(templateId).seedFlavor)`.
`RichTextEditor` already supports a `placeholder` prop for the Story body.

### 5. Layout — `apps/web/lib/layouts.ts`

Add `"rsvp"` to the Elegant preset's `sections`, as the closing call-to-action:

```
hero, welcome, story, schedule, wedding-party, travel-teaser,
things-to-do, gallery, registry-teaser, faqs, rsvp
```

(Placement is a reviewable decision — see Open Questions.)

## Default copy (draft)

Copy is tasteful and **generic** — representative of the template's tone, not a
fabricated specific narrative — since the couple sees it in draft preview.

### Classic
- **Hero:** title "We're Getting Married!", location "Seattle, Washington"
- **Story:** title "Our Story", body — a short, warm two-paragraph sample that
  reads as a placeholder prompt (e.g. an invitation to share how they met and
  what comes next), not invented events.
- **Details:** title "Wedding Details"
- **Schedule:** title "Schedule of Events"
- **RSVP:** title "RSVP"

### Elegant
- **Hero:** title (couple-names mode uses `coupleName`, not this), location
  "Seattle, Washington"
- **Welcome:** title "Welcome", message — a brief, warm greeting to guests.
- **Story:** title "Our Story", body — a short sample in the Elegant tone.
- **Schedule:** title "Schedule"
- **RSVP:** title "RSVP"

(Exact strings finalized during implementation; the above are placeholders for
this spec and should be reviewed.)

## Testing

- **Unit (`bun test`):**
  - `getTemplateContentDefaults` returns the right defaults per seedFlavor and
    falls back to classic for unknown flavors.
  - The resolution helper: DB value wins; default applied only when draft;
    published + empty → undefined; per-field non-empty checks for the story body.
  - `getLayoutPreset("elegant").sections` includes `"rsvp"`.
- **Behavior to verify manually (no component test infra in repo):**
  - Draft Elegant site renders default Story/Welcome; published empty site hides
    them; editing then publishing shows the real content.
  - Editors show template-aware placeholders matching the live draft fallback.

## Risks / edge cases

- **Status transitions:** flipping draft → published must immediately stop
  serving defaults. Both read `settings.status` at render time and the layout is
  revalidated on settings changes, so this is automatic.
- **Archived status:** treated as not-draft (defaults hidden), same as published.
- **Unknown `seedFlavor`:** `getTemplateContentDefaults` falls back to Classic
  defaults so a new template without curated copy still renders sensibly.

## Open questions for review

1. **RSVP placement in the Elegant flow.** Proposed as the final/closing section.
   Alternative: before `faqs`, or higher up right after `schedule`.
2. **Exact default copy strings** for each template (the section above is a
   first draft).
