import { db } from "@/lib/db";
import {
  getCeremonyAndReception,
  getWeddingContentSections,
  getWeddingSettings,
} from "@/lib/db/wedding-content-data";
import { getWeddingContext } from "@/lib/db/wedding-context";
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

/**
 * Build the admin onboarding checklist for the current wedding. Completion is
 * AUTO-DETECTED from real data on every load (never manually ticked) — that's
 * what separates it from the user-created Todos feature. Only the dismissal is
 * persisted (Wedding.onboardingDismissed); item state always reflects reality.
 */
export async function getOnboardingChecklistState(): Promise<OnboardingChecklistState> {
  const { weddingId, slug } = await getWeddingContext();
  const base = `/${slug}/admin`;

  const [
    wedding,
    settings,
    content,
    venues,
    placementCount,
    guestCount,
    registryCount,
  ] = await Promise.all([
    db.wedding.findUnique({
      where: { id: weddingId },
      select: { onboardingDismissed: true },
    }),
    getWeddingSettings(),
    getWeddingContentSections(),
    getCeremonyAndReception(),
    db.photoPlacement.count({ where: { weddingId } }),
    db.guest.count({ where: { weddingId } }),
    db.registryItem.count({ where: { weddingId, isActive: true } }),
  ]);

  const story = content.story as StoryContent | undefined;
  const storyHasText =
    (story?.paragraphs?.some((p) => p.trim().length > 0) ?? false) ||
    Boolean(story?.bodyHtml?.trim());
  const hasVenue = Boolean(venues.ceremony || venues.reception);

  const items: ChecklistItem[] = [
    {
      id: "photos",
      label: "Add photos",
      description: "Upload photos and place them on your site.",
      href: `${base}/photos`,
      done: placementCount > 0,
    },
    {
      id: "guests",
      label: "Add your guests",
      description: "Build your guest list so you can send invitations.",
      href: `${base}/guests`,
      done: guestCount > 0,
    },
    {
      id: "venue",
      label: "Set your venue & schedule",
      description: "Add where and when your events take place.",
      href: `${base}/events`,
      done: hasVenue,
    },
    {
      id: "story",
      label: "Write your story",
      description: "Share how you met and your journey together.",
      href: `${base}/content`,
      done: storyHasText,
    },
    {
      id: "rsvp",
      label: "Set your RSVP deadline",
      description: "Let guests know when to respond by.",
      href: `${base}/settings`,
      done: Boolean(settings.rsvpDeadline?.trim()),
    },
    {
      id: "registry",
      label: "Set up your registry",
      description: "Add gifts or funds for guests (optional).",
      href: `${base}/registry`,
      done: registryCount > 0,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return {
    items,
    doneCount,
    total: items.length,
    allDone: doneCount === items.length,
    dismissed: wedding?.onboardingDismissed ?? false,
  };
}
