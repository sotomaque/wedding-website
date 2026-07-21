import { db } from "@/lib/db";
import {
  getCeremonyAndReception,
  getWeddingContentSections,
  getWeddingSettings,
} from "@/lib/db/wedding-content-data";
import { getWeddingContext } from "@/lib/db/wedding-context";
import type { StoryContent } from "@/lib/validations/wedding-content";
import {
  buildOnboardingChecklist,
  type OnboardingChecklistState,
  storyHasText,
} from "./onboarding-checklist-core";

export type {
  ChecklistItem,
  OnboardingChecklistState,
} from "./onboarding-checklist-core";

/**
 * Build the admin onboarding checklist for the current wedding. Completion is
 * AUTO-DETECTED from real data on every load (never manually ticked) — that's
 * what separates it from the user-created Todos feature. Only the dismissal is
 * persisted (Wedding.onboardingDismissed); item state always reflects reality.
 *
 * This fetches the signals; the pure derivation lives in
 * onboarding-checklist-core.ts (unit-tested there).
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

  return buildOnboardingChecklist(base, {
    dismissed: wedding?.onboardingDismissed ?? false,
    hasPhotos: placementCount > 0,
    hasGuests: guestCount > 0,
    hasVenue: Boolean(venues.ceremony || venues.reception),
    hasStory: storyHasText(story),
    hasRsvpDeadline: Boolean(settings.rsvpDeadline?.trim()),
    hasRegistry: registryCount > 0,
  });
}
