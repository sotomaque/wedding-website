"use client";

import { useState } from "react";
import {
  DetailsEditor,
  FaqsEditor,
  HeroEditor,
  RsvpEditor,
  ScheduleEditor,
  StoryEditor,
  WeddingPartyEditor,
  WelcomeEditor,
} from "@/components/customization/content-editors";
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

type Tab =
  | "hero"
  | "welcome"
  | "story"
  | "details"
  | "schedule"
  | "wedding-party"
  | "faqs"
  | "rsvp";

const TABS: { key: Tab; label: string }[] = [
  { key: "hero", label: "Cover" },
  { key: "welcome", label: "Welcome" },
  { key: "story", label: "Story" },
  { key: "details", label: "Details" },
  { key: "schedule", label: "Schedule" },
  { key: "wedding-party", label: "Wedding Party" },
  { key: "faqs", label: "FAQs" },
  { key: "rsvp", label: "RSVP" },
];

interface ContentEditorClientProps {
  content: Record<string, unknown>;
  coupleName: string;
  heroDisplay: "title" | "couple-names";
}

export function ContentEditorClient({
  content,
  coupleName,
  heroDisplay,
}: ContentEditorClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("hero");

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-6">Content Editor</h1>

      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "hero" && (
        <HeroEditor
          initial={content.hero as HeroContent | undefined}
          initialCoupleName={coupleName}
          currentDisplay={heroDisplay}
        />
      )}
      {activeTab === "welcome" && (
        <WelcomeEditor
          initial={content.welcome as WelcomeContent | undefined}
        />
      )}
      {activeTab === "story" && (
        <StoryEditor initial={content.story as StoryContent | undefined} />
      )}
      {activeTab === "details" && (
        <DetailsEditor
          initial={content.details as DetailsContent | undefined}
        />
      )}
      {activeTab === "schedule" && (
        <ScheduleEditor
          initial={content.schedule as ScheduleContent | undefined}
        />
      )}
      {activeTab === "wedding-party" && (
        <WeddingPartyEditor
          initial={content["wedding-party"] as WeddingPartyContent | undefined}
        />
      )}
      {activeTab === "faqs" && (
        <FaqsEditor initial={content.faqs as FaqsContent | undefined} />
      )}
      {activeTab === "rsvp" && (
        <RsvpEditor initial={content.rsvp as RsvpContent | undefined} />
      )}
    </div>
  );
}
