import type { StoryContent } from "@/lib/validations/wedding-content";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  /** Admin page that resolves this item. */
  href: string;
  done: boolean;
}

export interface OnboardingChecklistState {
  items: ChecklistItem[];
  doneCount: number;
  total: number;
  allDone: boolean;
  dismissed: boolean;
}

/** The auto-detected signals that drive the checklist. */
export interface ChecklistSignals {
  dismissed: boolean;
  hasPhotos: boolean;
  hasGuests: boolean;
  hasVenue: boolean;
  hasStory: boolean;
  hasRsvpDeadline: boolean;
  hasRegistry: boolean;
}

/** Whether the Our Story section has real prose (paragraphs or rich text). */
export function storyHasText(story: StoryContent | undefined): boolean {
  return (
    (story?.paragraphs?.some((p) => p.trim().length > 0) ?? false) ||
    Boolean(story?.bodyHtml?.trim())
  );
}

/**
 * Pure transform from detected signals to the checklist state. Kept free of any
 * data-access imports so it's unit-testable without mocking (the data fetching
 * lives in onboarding-checklist.ts).
 */
export function buildOnboardingChecklist(
  base: string,
  signals: ChecklistSignals,
): OnboardingChecklistState {
  const items: ChecklistItem[] = [
    {
      id: "photos",
      label: "Add photos",
      description: "Upload photos and place them on your site.",
      href: `${base}/photos`,
      done: signals.hasPhotos,
    },
    {
      id: "guests",
      label: "Add your guests",
      description: "Build your guest list so you can send invitations.",
      href: `${base}/guests`,
      done: signals.hasGuests,
    },
    {
      id: "venue",
      label: "Set your venue & schedule",
      description: "Add where and when your events take place.",
      href: `${base}/events`,
      done: signals.hasVenue,
    },
    {
      id: "story",
      label: "Write your story",
      description: "Share how you met and your journey together.",
      href: `${base}/content`,
      done: signals.hasStory,
    },
    {
      id: "rsvp",
      label: "Set your RSVP deadline",
      description: "Let guests know when to respond by.",
      href: `${base}/settings`,
      done: signals.hasRsvpDeadline,
    },
    {
      id: "registry",
      label: "Set up your registry",
      description: "Add gifts or funds for guests (optional).",
      href: `${base}/registry`,
      done: signals.hasRegistry,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return {
    items,
    doneCount,
    total: items.length,
    allDone: doneCount === items.length,
    dismissed: signals.dismissed,
  };
}
