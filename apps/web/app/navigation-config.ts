import type { NavItem } from "@workspace/ui/components/navigation";
import type { FeatureToggles } from "@/lib/validations/wedding-content";

interface NavLabels {
  ourStory: string;
  details: string;
  schedule: string;
  planning: string;
  thingsToDo: string;
  hotels: string;
  tripPlanner: string;
  registry: string;
  rsvp: string;
}

const defaultLabels: NavLabels = {
  ourStory: "Our Story",
  details: "Details",
  schedule: "Schedule",
  planning: "Planning",
  thingsToDo: "Things To Do",
  hotels: "Hotels",
  tripPlanner: "Trip Planner",
  registry: "Registry",
  rsvp: "RSVP",
};

export function getNavigationConfig(
  slug: string,
  options?: {
    brandImage?: { url: string | null; alt: string | null };
    featureToggles?: FeatureToggles;
    labels?: NavLabels;
  },
) {
  const base = `/${slug}`;
  const toggles = options?.featureToggles;
  const labels = options?.labels ?? defaultLabels;

  // Build "Planning" group (Things To Do + Hotels)
  const planningLinks: { href: string; label: string }[] = [];
  if (toggles?.thingsToDo !== false) {
    planningLinks.push({
      href: `${base}/things-to-do`,
      label: labels.thingsToDo,
    });
  }
  if (toggles?.hotels !== false) {
    planningLinks.push({ href: `${base}/hotels`, label: labels.hotels });
  }
  if (toggles?.tripPlanner !== false) {
    planningLinks.push({
      href: `${base}/trip-planner`,
      label: labels.tripPlanner,
    });
  }

  const rightLinks: NavItem[] = [];

  // Add Planning group if it has links
  if (planningLinks.length > 0) {
    rightLinks.push({ label: labels.planning, links: planningLinks });
  }
  if (toggles?.registry !== false) {
    rightLinks.push({ href: `${base}/registry`, label: labels.registry });
  }
  rightLinks.push({ href: `${base}#rsvp`, label: labels.rsvp });

  return {
    brandImage: {
      src: options?.brandImage?.url ?? "/nav.png",
      alt: options?.brandImage?.alt ?? "Wedding",
      width: 200,
      height: 100,
    },
    leftLinks: [
      { href: `${base}#story`, label: labels.ourStory },
      { href: `${base}#details`, label: labels.details },
      { href: `${base}#schedule`, label: labels.schedule },
    ] as NavItem[],
    rightLinks,
  };
}
