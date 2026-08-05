# Template Default Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-template default copy for text sections — shown on draft sites and as editor placeholders, hidden from published-site guests — plus RSVP on the Elegant layout and a fix for the empty "Our Story" header.

**Architecture:** A single per-template defaults module (`template-content-defaults.ts`), keyed by `template.seedFlavor`, holds default copy and pure resolution helpers. The public page (`page.tsx`) resolves each text section's effective content (DB value → template default when `status === "draft"` → empty) and passes it to the section components, which hide themselves when empty. The admin editors read the same module for placeholder text. The Elegant layout gains `rsvp` as a closing section.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Bun test, Biome.

**Deviations from spec (intentional, scoping):**
- Render-path fallback covers the fields that are genuinely empty by default: **Story body, Welcome message, Hero location**. Section **titles** (Story/Details/Schedule/RSVP) keep their existing next-intl / component fallbacks — overriding them with English template strings would regress localization and isn't needed to fix the empty-section problem.
- Story default body is stored as `paragraphs: string[]` (single source); the render path uses it as paragraphs and the Story editor placeholder derives a plain-text hint by joining them — avoids HTML inside an editor placeholder.

**Environment note (Windows):** Repo files are stored with LF but the Windows working copy may show CRLF. Newly created files (Write) are LF and pass Biome. If a `lefthook`/`lint-staged` pre-commit hook flags line endings on a *modified existing* file, run `bunx biome format --write <files>` from `apps/web` and re-stage. All `bun` commands run from `apps/web` unless noted.

---

### Task 1: Defaults module + getter

**Files:**
- Create: `apps/web/lib/template-content-defaults.ts`
- Test: `apps/web/__tests__/lib/template-content-defaults.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/lib/template-content-defaults.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  getTemplateContentDefaults,
  TEMPLATE_CONTENT_DEFAULTS,
} from "@/lib/template-content-defaults";

describe("getTemplateContentDefaults", () => {
  it("returns classic defaults for the classic flavor", () => {
    const d = getTemplateContentDefaults("classic");
    expect(d.story?.paragraphs?.length ?? 0).toBeGreaterThan(0);
    expect(d.welcome?.message).toBeTruthy();
    expect(d.hero?.location).toBeTruthy();
  });

  it("returns elegant defaults for the elegant flavor", () => {
    const d = getTemplateContentDefaults("elegant");
    expect(d.story?.paragraphs?.length ?? 0).toBeGreaterThan(0);
    expect(d.welcome?.message).toBeTruthy();
  });

  it("falls back to classic for unknown/null/undefined flavors", () => {
    const classic = TEMPLATE_CONTENT_DEFAULTS.classic;
    expect(getTemplateContentDefaults("nope")).toBe(classic);
    expect(getTemplateContentDefaults(null)).toBe(classic);
    expect(getTemplateContentDefaults(undefined)).toBe(classic);
  });

  it("defines defaults for every seedFlavor used by a template preset", () => {
    // Guards against adding a template without curated copy.
    expect(TEMPLATE_CONTENT_DEFAULTS.classic).toBeDefined();
    expect(TEMPLATE_CONTENT_DEFAULTS.elegant).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test __tests__/lib/template-content-defaults.test.ts`
Expected: FAIL — cannot resolve `@/lib/template-content-defaults`.

- [ ] **Step 3: Write the module**

Create `apps/web/lib/template-content-defaults.ts`:

```ts
/**
 * Per-template default copy for the text content sections.
 *
 * Keyed by `TemplatePreset.seedFlavor` (the field's long-promised purpose).
 * One source of truth consumed by two places:
 *   - the public render path, as a fallback for empty sections **on draft
 *     sites only** (published sites hide empty sections so guests never see
 *     sample copy);
 *   - the admin content editors, as placeholder text.
 *
 * Only fields that are genuinely empty by default live here: the Story body,
 * the Welcome message, and the Hero location. Section titles keep their
 * existing next-intl / component fallbacks.
 */
import type {
  HeroContent,
  StoryContent,
  WelcomeContent,
} from "@/lib/validations/wedding-content";

export interface TemplateContentDefaults {
  hero?: { location?: string };
  welcome?: { title?: string; message?: string };
  story?: { title?: string; paragraphs?: string[] };
}

export const TEMPLATE_CONTENT_DEFAULTS: Record<string, TemplateContentDefaults> =
  {
    classic: {
      hero: { location: "Seattle, Washington" },
      welcome: {
        title: "Welcome!",
        message:
          "To our friends and family: we're so excited to celebrate our wedding with you. Find all the details you'll need for our big day right here.",
      },
      story: {
        title: "Our Story",
        paragraphs: [
          "This is where your love story comes to life. Tell your guests how you met, the moment you knew, and the journey that led to your wedding day.",
          "Edit this section any time from the Content editor to make it your own.",
        ],
      },
    },
    elegant: {
      hero: { location: "Seattle, Washington" },
      welcome: {
        title: "Welcome",
        message:
          "We're so glad you're here. Join us as we celebrate our wedding — explore the details below to find everything you'll need for our big day.",
      },
      story: {
        title: "Our Story",
        paragraphs: [
          "Every great love has a story worth telling. Share yours here — the chance meeting, the quiet moments, and the adventures that brought you to this day.",
          "Replace this sample with your own words from the Content editor.",
        ],
      },
    },
  };

const DEFAULT_FLAVOR = "classic";

/**
 * Defaults for a seedFlavor. Falls back to the classic defaults for unknown,
 * null, or undefined flavors so a new template without curated copy still
 * renders sensibly.
 */
export function getTemplateContentDefaults(
  seedFlavor: string | null | undefined,
): TemplateContentDefaults {
  if (!seedFlavor) {
    return TEMPLATE_CONTENT_DEFAULTS[DEFAULT_FLAVOR] as TemplateContentDefaults;
  }
  return (
    TEMPLATE_CONTENT_DEFAULTS[seedFlavor] ??
    (TEMPLATE_CONTENT_DEFAULTS[DEFAULT_FLAVOR] as TemplateContentDefaults)
  );
}
```

(The `HeroContent`, `StoryContent`, `WelcomeContent` imports are used by the resolution helpers added in Task 2.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test __tests__/lib/template-content-defaults.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/template-content-defaults.ts apps/web/__tests__/lib/template-content-defaults.test.ts
git commit -m "feat(content): per-template default copy module"
```

---

### Task 2: Resolution helpers

**Files:**
- Modify: `apps/web/lib/template-content-defaults.ts`
- Test: `apps/web/__tests__/lib/template-content-defaults.test.ts`

- [ ] **Step 1: Write the failing tests** (append to the existing test file)

```ts
import {
  resolveHeroContent,
  resolveStoryContent,
  resolveWelcomeContent,
} from "@/lib/template-content-defaults";

describe("resolveStoryContent", () => {
  const defaults = getTemplateContentDefaults("elegant");

  it("returns content unchanged when it already has paragraphs", () => {
    const content = { title: "Us", paragraphs: ["real"] };
    expect(resolveStoryContent(content, defaults, true)).toBe(content);
  });

  it("returns content unchanged when it already has bodyHtml", () => {
    const content = { title: "Us", paragraphs: [], bodyHtml: "<p>real</p>" };
    expect(resolveStoryContent(content, defaults, true)).toBe(content);
  });

  it("injects default paragraphs when empty and draft", () => {
    const resolved = resolveStoryContent({ title: "Us", paragraphs: [] }, defaults, true);
    expect(resolved?.paragraphs.length).toBeGreaterThan(0);
    expect(resolved?.title).toBe("Us"); // keeps the user's title
  });

  it("does NOT inject when empty and published", () => {
    const content = { title: "Us", paragraphs: [] };
    expect(resolveStoryContent(content, defaults, false)).toBe(content);
  });

  it("uses the default title when content has none", () => {
    const resolved = resolveStoryContent(undefined, defaults, true);
    expect(resolved?.title).toBe("Our Story");
  });
});

describe("resolveWelcomeContent", () => {
  const defaults = getTemplateContentDefaults("elegant");

  it("returns content unchanged when it has a non-empty message", () => {
    const content = { title: "Hi", message: "real" };
    expect(resolveWelcomeContent(content, defaults, true)).toBe(content);
  });

  it("injects the default message when empty and draft", () => {
    const resolved = resolveWelcomeContent({ title: "Hi", message: "  " }, defaults, true);
    expect(resolved?.message).toBe(defaults.welcome?.message);
  });

  it("does NOT inject when empty and published", () => {
    const content = { title: "Hi", message: "" };
    expect(resolveWelcomeContent(content, defaults, false)).toBe(content);
  });
});

describe("resolveHeroContent", () => {
  const defaults = getTemplateContentDefaults("elegant");

  it("keeps a user-provided location", () => {
    const content = { title: "T", location: "Paris" };
    expect(resolveHeroContent(content, defaults, true)).toBe(content);
  });

  it("injects the default location when empty and draft", () => {
    const resolved = resolveHeroContent({ title: "T" }, defaults, true);
    expect(resolved?.location).toBe(defaults.hero?.location);
  });

  it("does NOT inject when empty and published", () => {
    const content = { title: "T" };
    expect(resolveHeroContent(content, defaults, false)).toBe(content);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && bun test __tests__/lib/template-content-defaults.test.ts`
Expected: FAIL — `resolveStoryContent`/`resolveWelcomeContent`/`resolveHeroContent` are not exported.

- [ ] **Step 3: Append the helpers to `template-content-defaults.ts`**

```ts
/** True when the story has author-provided body content. */
function storyHasBody(content: StoryContent | undefined): boolean {
  return Boolean(content?.bodyHtml || (content?.paragraphs?.length ?? 0) > 0);
}

/**
 * Effective story content for rendering. The user's content wins; an empty
 * story falls back to the template default body only on draft sites. Published
 * + empty returns the content untouched, so the Story section hides itself.
 */
export function resolveStoryContent(
  content: StoryContent | undefined,
  defaults: TemplateContentDefaults,
  isDraft: boolean,
): StoryContent | undefined {
  if (storyHasBody(content)) return content;
  if (isDraft && (defaults.story?.paragraphs?.length ?? 0) > 0) {
    return {
      title: content?.title ?? defaults.story?.title ?? "Our Story",
      paragraphs: defaults.story?.paragraphs ?? [],
    };
  }
  return content;
}

/** Effective welcome content — default message on draft only. */
export function resolveWelcomeContent(
  content: WelcomeContent | undefined,
  defaults: TemplateContentDefaults,
  isDraft: boolean,
): WelcomeContent | undefined {
  if (content?.message?.trim()) return content;
  if (isDraft && defaults.welcome?.message) {
    return {
      title: content?.title ?? defaults.welcome.title,
      message: defaults.welcome.message,
    };
  }
  return content;
}

/** Effective hero content — default location on draft only. */
export function resolveHeroContent(
  content: HeroContent | undefined,
  defaults: TemplateContentDefaults,
  isDraft: boolean,
): HeroContent | undefined {
  if (content?.location?.trim()) return content;
  if (isDraft && defaults.hero?.location) {
    return {
      title: content?.title ?? "",
      location: defaults.hero.location,
    };
  }
  return content;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && bun test __tests__/lib/template-content-defaults.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/template-content-defaults.ts apps/web/__tests__/lib/template-content-defaults.test.ts
git commit -m "feat(content): draft-gated section resolution helpers"
```

---

### Task 3: Add RSVP to the Elegant layout

**Files:**
- Modify: `apps/web/lib/layouts.ts:69-80`
- Test: `apps/web/__tests__/lib/layouts.test.ts`

- [ ] **Step 1: Write the failing test** (append to `apps/web/__tests__/lib/layouts.test.ts`)

```ts
import { describe, expect, it } from "bun:test";
import { getLayoutPreset } from "@/lib/layouts";

describe("elegant layout", () => {
  it("includes rsvp as the closing section", () => {
    const sections = getLayoutPreset("elegant").sections;
    expect(sections).toContain("rsvp");
    expect(sections[sections.length - 1]).toBe("rsvp");
  });
});
```

(If the file already imports `describe/expect/it` or `getLayoutPreset`, reuse the existing imports rather than duplicating.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test __tests__/lib/layouts.test.ts`
Expected: FAIL — `sections` does not contain `"rsvp"`.

- [ ] **Step 3: Add `"rsvp"` to the elegant preset**

In `apps/web/lib/layouts.ts`, change the elegant preset's `sections` array (currently ending `..., "registry-teaser", "faqs"`) to append `"rsvp"`:

```ts
    sections: [
      "hero",
      "welcome",
      "story",
      "schedule",
      "wedding-party",
      "travel-teaser",
      "things-to-do",
      "gallery",
      "registry-teaser",
      "faqs",
      "rsvp",
    ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test __tests__/lib/layouts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/layouts.ts apps/web/__tests__/lib/layouts.test.ts
git commit -m "feat(layout): add RSVP section to the Elegant template"
```

---

### Task 4: Wire the public render path + fix section gating

No new unit tests (the repo has no component-test harness); correctness is covered by Task 1–2 helper tests and verified via typecheck + manual check. This task is pure integration.

**Files:**
- Modify: `apps/web/app/[slug]/(public)/page.tsx`
- Modify: `apps/web/components/elegant-story-section.tsx:23`
- Modify: `apps/web/components/welcome-section.tsx`

- [ ] **Step 1: Resolve effective content in `page.tsx`**

Add the import (with the existing `@/lib/templates` import group):

```ts
import {
  getTemplateContentDefaults,
  resolveHeroContent,
  resolveStoryContent,
  resolveWelcomeContent,
} from "@/lib/template-content-defaults";
```

Immediately after `const template = getTemplatePreset(settings.templateId);` (around line 118) add:

```ts
  const contentDefaults = getTemplateContentDefaults(template.seedFlavor);
  const isDraft = settings.status === "draft";
  const heroContent = resolveHeroContent(
    content.hero as HeroContent | undefined,
    contentDefaults,
    isDraft,
  );
  const storyContent = resolveStoryContent(
    content.story as StoryContent | undefined,
    contentDefaults,
    isDraft,
  );
  const welcomeContent = resolveWelcomeContent(
    content.welcome as WelcomeContent | undefined,
    contentDefaults,
    isDraft,
  );
```

- [ ] **Step 2: Use the resolved content in the section map**

In `page.tsx`, replace the hero/story/welcome reads in `sectionMap`:

- Hero (`heroDisplay === "couple-names"` branch): `location={(content.hero as HeroContent)?.location}` → `location={heroContent?.location}`.
- Hero empty branch: `title={(content.hero as HeroContent)?.title}` → `title={heroContent?.title}`.
- Hero title branch: `title={(content.hero as HeroContent)?.title}` → `title={heroContent?.title}`.
- Story (both branches): `content={content.story as StoryContent}` → `content={storyContent}`.
- Welcome: `content={content.welcome as WelcomeContent | undefined}` → `content={welcomeContent}`.

- [ ] **Step 3: Fix the Elegant story gating**

In `apps/web/components/elegant-story-section.tsx`, change line 23 from:

```tsx
  if (!hasText && !content?.title) return null;
```

to (gate on body presence only, matching Classic — a title alone must not render an empty section):

```tsx
  if (!hasText) return null;
```

- [ ] **Step 4: Rewrite `WelcomeSection` to gate on message**

Replace the body of `apps/web/components/welcome-section.tsx` (remove the `DEFAULT_TITLE` / `DEFAULT_MESSAGE` constants; hide when there is no message):

```tsx
import type { WelcomeContent } from "@/lib/validations/wedding-content";

interface WelcomeSectionProps {
  content?: WelcomeContent;
}

/**
 * Welcome section — short greeting paragraph under the hero. Hidden when there
 * is no message: the public page injects the template default message on draft
 * sites (so the couple previews a populated section) and leaves it empty on
 * published sites (so guests never see sample copy). See
 * `resolveWelcomeContent` in lib/template-content-defaults.ts.
 */
export function WelcomeSection({ content }: WelcomeSectionProps) {
  const message = content?.message?.trim();
  if (!message) return null;
  const title = content?.title?.trim() || "Welcome";

  return (
    <section id="welcome" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          {title}
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-12" />
        <p className="text-foreground/90 text-lg md:text-xl leading-relaxed">
          {message}
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app apps/web/components/elegant-story-section.tsx apps/web/components/welcome-section.tsx
git commit -m "feat(content): draft-gated default content on the public page + fix empty story header"
```

---

### Task 5: Editor placeholders from template defaults

Threads the template defaults into the three editors whose render fallback exists, so the editor placeholder matches the draft preview. Component-only change (no unit tests); verified by typecheck.

**Files:**
- Modify: `apps/web/components/customization/content-editors.tsx` (HeroEditor, StoryEditor, WelcomeEditor)
- Modify: `apps/web/app/[slug]/admin/content/content-editor-client.tsx`
- Modify: `apps/web/app/[slug]/admin/content/page.tsx`
- Modify: `apps/web/components/customization/inline-customizer.tsx`

- [ ] **Step 1: Add placeholder props to the three editors**

In `content-editors.tsx`:

`HeroEditor` — add `locationPlaceholder?: string` to its props type, and change the location Input:
```tsx
          placeholder={locationPlaceholder ?? "Seattle, Washington"}
```

`StoryEditor` — add `bodyPlaceholder?: string` to its props type (`{ initial }` → `{ initial, bodyPlaceholder }`), and change the `RichTextEditor`:
```tsx
          <RichTextEditor
            content={bodyHtml}
            onChange={setBodyHtml}
            placeholder={
              bodyPlaceholder ??
              "We met at a coffee shop in Brooklyn back in 2019, both ducking in from the rain. Three years and one rescue dog later, Alex proposed on a hike in the Catskills with terrible cell service and perfect timing. We can't wait to celebrate with the people who made our story possible."
            }
          />
```

`WelcomeEditor` — add `messagePlaceholder?: string` to its props type, and change the message Textarea:
```tsx
          placeholder={
            messagePlaceholder ??
            "To our friends and family: we're so excited to celebrate our wedding with you..."
          }
```

- [ ] **Step 2: Thread defaults through `content-editor-client.tsx`**

Add the import and prop:
```tsx
import type { TemplateContentDefaults } from "@/lib/template-content-defaults";
```
Add `defaults: TemplateContentDefaults` to `ContentEditorClientProps` and the destructured params. Then pass placeholders to the three editors:
```tsx
        <HeroEditor
          initial={content.hero as HeroContent | undefined}
          initialCoupleName={coupleName}
          currentDisplay={heroDisplay}
          locationPlaceholder={defaults.hero?.location}
        />
```
```tsx
        <WelcomeEditor
          initial={content.welcome as WelcomeContent | undefined}
          messagePlaceholder={defaults.welcome?.message}
        />
```
```tsx
        <StoryEditor
          initial={content.story as StoryContent | undefined}
          bodyPlaceholder={defaults.story?.paragraphs?.join("\n\n")}
        />
```

- [ ] **Step 3: Compute defaults in the content page**

In `apps/web/app/[slug]/admin/content/page.tsx` add the import:
```ts
import { getTemplateContentDefaults } from "@/lib/template-content-defaults";
```
After `const heroDisplay = getTemplatePreset(settings.templateId).heroDisplay;` add:
```ts
  const contentDefaults = getTemplateContentDefaults(
    getTemplatePreset(settings.templateId).seedFlavor,
  );
```
Pass it to the client:
```tsx
        <ContentEditorClient
          content={contentMap}
          coupleName={settings.coupleName}
          heroDisplay={heroDisplay}
          defaults={contentDefaults}
        />
```

- [ ] **Step 4: Thread defaults through the inline customizer**

In `apps/web/components/customization/inline-customizer.tsx` add the import:
```ts
import { getTemplateContentDefaults } from "@/lib/template-content-defaults";
```
Inside `ContentTabBody`, before the `switch`, compute:
```ts
  const defaults = getTemplateContentDefaults(template.seedFlavor);
```
Then update the three editor cases to pass placeholders:
```tsx
    case "hero":
      return (
        <HeroEditor
          initial={content.hero as HeroContent | undefined}
          initialCoupleName={wedding.coupleName}
          currentDisplay={template.heroDisplay}
          locationPlaceholder={defaults.hero?.location}
        />
      );
    case "story":
      return (
        <StoryEditor
          initial={content.story as StoryContent | undefined}
          bodyPlaceholder={defaults.story?.paragraphs?.join("\n\n")}
        />
      );
```
```tsx
    case "welcome":
      return (
        <WelcomeEditor
          initial={content.welcome as WelcomeContent | undefined}
          messagePlaceholder={defaults.welcome?.message}
        />
      );
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/customization/content-editors.tsx apps/web/components/customization/inline-customizer.tsx apps/web/app/[slug]/admin/content
git commit -m "feat(content): template-aware editor placeholders"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `cd apps/web && bun test`
Expected: all tests pass (including the new `template-content-defaults` and updated `layouts` tests).

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Lint the changed files**

Run: `cd apps/web && bunx biome check lib/template-content-defaults.ts lib/layouts.ts components/welcome-section.tsx components/elegant-story-section.tsx components/customization/content-editors.tsx components/customization/inline-customizer.tsx`
Expected: no lint-rule errors. (Whole-file CRLF formatter noise on pre-existing files is an environment artifact — see the Environment note; new files should be clean.)

- [ ] **Step 4: Manual behavior check (document results)**

With a draft wedding switched to Elegant:
- Public page shows the Story section with default prose (no bare header), a Welcome greeting, and an RSVP section at the end.
- Content editor shows the same Story/Welcome/Hero defaults as greyed placeholders.

Set the wedding `status` to `published` with those sections still empty:
- Story and Welcome sections are now hidden; RSVP still shows.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(content): verification cleanup for template default content"
```

---

## Self-review

- **Spec coverage:** single source of truth (Task 1) ✓; draft-gated render fallback (Task 2, 4) ✓; editor placeholders (Task 5) ✓; published hides empty (Task 4 — story gating + welcome rewrite) ✓; RSVP on Elegant (Task 3) ✓; empty Story header fix (Task 4 Step 3) ✓; Welcome behavior change (Task 4 Step 4) ✓.
- **Scope refinement vs spec:** titles left to existing i18n fallbacks; story default stored as `paragraphs` — both documented in the header.
- **Type consistency:** `TemplateContentDefaults`, `resolveStoryContent/WelcomeContent/HeroContent`, and the editor prop names (`locationPlaceholder`, `bodyPlaceholder`, `messagePlaceholder`) are used identically across tasks. Return shapes satisfy the Zod-inferred types (`StoryContent.paragraphs` required, `HeroContent.title` required).
