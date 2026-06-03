"use client";

import type { Wedding } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { ExternalLink, Palette } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getLayoutPreset, type SectionKey } from "@/lib/layouts";
import { getTemplatePreset, type TemplatePreset } from "@/lib/templates";
import type {
  DetailsContent,
  FaqsContent,
  HeroContent,
  RsvpContent,
  ScheduleContent,
  StoryContent,
  WeddingPartyContent,
  WelcomeContent,
} from "@/lib/validations/wedding-content";
import {
  BrandingPicker,
  FontPicker,
  TemplatePicker,
  ThemePicker,
} from "./appearance-pickers";
import {
  DetailsEditor,
  FaqsEditor,
  HeroEditor,
  RsvpEditor,
  ScheduleEditor,
  StoryEditor,
  WeddingPartyEditor,
  WelcomeEditor,
} from "./content-editors";

type TopTab = "design" | "content";
type DesignTab = "template" | "theme" | "font" | "logo";

const DESIGN_TABS: { key: DesignTab; label: string }[] = [
  { key: "template", label: "Template" },
  { key: "theme", label: "Color theme" },
  { key: "font", label: "Typography" },
  { key: "logo", label: "Logo" },
];

/**
 * Per-section behavior in the Content tab. `editor` renders the matching
 * editor component; `crossLink` renders a stub panel with a link to a
 * dedicated admin route (used for sections backed by their own admin
 * surface — events, photos, registry); `hidden` removes the tab entirely
 * (for sections that aren't editable anywhere — welcome / wedding-party /
 * faqs are still hardcoded; hotels / activities have no admin route yet).
 */
type SectionTabConfig =
  | { kind: "editor"; label: string }
  | { kind: "crossLink"; label: string; adminPath: string; note: string }
  | { kind: "hidden" };

function getSectionConfig(
  sectionKey: SectionKey,
  template: TemplatePreset,
): SectionTabConfig {
  switch (sectionKey) {
    case "hero":
      return { kind: "editor", label: "Cover" };
    case "story":
      return { kind: "editor", label: "Story" };
    case "details":
      return { kind: "editor", label: "Details" };
    case "schedule":
      // The events-card variant pulls from the events table — not from
      // content.schedule — so editing it via the content editor does
      // nothing visible. Send the admin to the Events page instead.
      if (template.scheduleStyle === "events-card") {
        return {
          kind: "crossLink",
          label: "Schedule",
          adminPath: "admin/events",
          note: "Your current template's schedule is driven by your Events list. Edit times, venues, and descriptions on the Events page.",
        };
      }
      return { kind: "editor", label: "Schedule" };
    case "rsvp":
      return { kind: "editor", label: "RSVP" };
    case "gallery":
      return {
        kind: "crossLink",
        label: "Gallery",
        adminPath: "admin/photos",
        note: "Upload and reorder gallery photos on the Photos page.",
      };
    case "registry-teaser":
      return {
        kind: "crossLink",
        label: "Registry",
        adminPath: "admin/registry",
        note: "Add and edit registry items on the Registry page.",
      };
    case "welcome":
      return { kind: "editor", label: "Welcome" };
    case "wedding-party":
      return { kind: "editor", label: "Wedding party" };
    case "faqs":
      return { kind: "editor", label: "FAQs" };
    case "travel-teaser":
      return {
        kind: "crossLink",
        label: "Travel",
        adminPath: "admin/hotels",
        note: "Add and edit hotel recommendations on the Hotels page.",
      };
    case "things-to-do":
      return {
        kind: "crossLink",
        label: "Things to do",
        adminPath: "admin/activities",
        note: "Add and edit activity recommendations on the Activities page.",
      };
  }
}

/**
 * Admin-only floating editor surfaced on public wedding pages. Reuses the
 * same picker + editor components as `/[slug]/admin/settings` (Appearance)
 * and `/[slug]/admin/content` so a saved change here is identical to one
 * saved from the admin pages. Both server actions revalidate the `[slug]`
 * layout, so the page behind the sheet refreshes automatically.
 *
 * Content sub-tabs are derived from the current template's layout so an
 * admin never sees a tab that edits data their template won't render.
 *
 * Visibility gating happens in the parent (server-rendered) layout: when the
 * viewer is not an admin, this component is never rendered or shipped to the
 * client.
 */
export function InlineCustomizer({
  wedding,
  content,
}: {
  wedding: Wedding;
  content: Record<string, unknown>;
}) {
  const template = getTemplatePreset(wedding.templateId);
  const layout = getLayoutPreset(template.layoutId);

  // Build the visible Content sub-tabs in layout order (matches the order
  // sections appear on the live page so the Sheet feels spatially aligned).
  const sectionTabs = layout.sections
    .map((key) => ({ key, config: getSectionConfig(key, template) }))
    .filter(
      (
        item,
      ): item is {
        key: SectionKey;
        config: Exclude<SectionTabConfig, { kind: "hidden" }>;
      } => item.config.kind !== "hidden",
    );

  const [open, setOpen] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>("design");
  const [designTab, setDesignTab] = useState<DesignTab>("template");
  const [contentTab, setContentTab] = useState<SectionKey>(
    sectionTabs[0]?.key ?? "hero",
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="lg"
          className="fixed bottom-4 right-4 z-50 shadow-lg gap-2"
        >
          <Palette className="size-4" />
          Customize
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Customize site</SheetTitle>
          <SheetDescription>
            Changes save instantly and update the page behind this panel.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex gap-2 border-b border-border">
          {(["design", "content"] as TopTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTopTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                topTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {topTab === "design" && (
          <div className="mt-6 pb-10 flex gap-4">
            <nav className="w-32 shrink-0 flex flex-col gap-0.5 border-r border-border pr-2">
              {DESIGN_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDesignTab(key)}
                  className={`text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    designTab === key
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex-1 min-w-0">
              {designTab === "template" && <TemplatePicker wedding={wedding} />}
              {designTab === "theme" && <ThemePicker wedding={wedding} />}
              {designTab === "font" && <FontPicker wedding={wedding} />}
              {designTab === "logo" && <BrandingPicker wedding={wedding} />}
            </div>
          </div>
        )}

        {topTab === "content" && (
          <div className="mt-6 pb-10 flex gap-4">
            <nav className="w-32 shrink-0 flex flex-col gap-0.5 border-r border-border pr-2">
              {sectionTabs.map(({ key, config }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setContentTab(key)}
                  className={`text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    contentTab === key
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 min-w-0">
              <ContentTabBody
                sectionKey={contentTab}
                config={
                  sectionTabs.find((t) => t.key === contentTab)?.config ?? {
                    kind: "editor",
                    label: "",
                  }
                }
                content={content}
                template={template}
                wedding={wedding}
              />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ContentTabBody({
  sectionKey,
  config,
  content,
  template,
  wedding,
}: {
  sectionKey: SectionKey;
  config: Exclude<SectionTabConfig, { kind: "hidden" }>;
  content: Record<string, unknown>;
  template: TemplatePreset;
  wedding: Wedding;
}) {
  if (config.kind === "crossLink") {
    return <SectionLink slug={wedding.slug} {...config} />;
  }
  switch (sectionKey) {
    case "hero":
      return (
        <HeroEditor
          initial={content.hero as HeroContent | undefined}
          initialCoupleName={wedding.coupleName}
          currentDisplay={template.heroDisplay}
        />
      );
    case "story":
      return (
        <StoryEditor initial={content.story as StoryContent | undefined} />
      );
    case "details":
      return (
        <DetailsEditor
          initial={content.details as DetailsContent | undefined}
        />
      );
    case "schedule":
      return (
        <ScheduleEditor
          initial={content.schedule as ScheduleContent | undefined}
        />
      );
    case "rsvp":
      return <RsvpEditor initial={content.rsvp as RsvpContent | undefined} />;
    case "welcome":
      return (
        <WelcomeEditor
          initial={content.welcome as WelcomeContent | undefined}
        />
      );
    case "wedding-party":
      return (
        <WeddingPartyEditor
          initial={content["wedding-party"] as WeddingPartyContent | undefined}
        />
      );
    case "faqs":
      return <FaqsEditor initial={content.faqs as FaqsContent | undefined} />;
    default:
      return null;
  }
}

function SectionLink({
  slug,
  label,
  adminPath,
  note,
}: {
  slug: string;
  label: string;
  adminPath: string;
  note: string;
}) {
  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">{note}</p>
      <Button asChild variant="outline">
        {/* Open the dedicated admin page in a new tab so the customizer (and
            its in-progress state) stays put — the ExternalLink icon signals it. */}
        <Link
          href={`/${slug}/${adminPath}`}
          target="_blank"
          rel="noopener noreferrer"
          className="gap-2"
        >
          Open {label} editor
          <ExternalLink className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
