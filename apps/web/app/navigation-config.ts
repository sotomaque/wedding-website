import type { NavItem } from "@workspace/ui/components/navigation";
import type { FeatureToggles } from "@/lib/validations/wedding-content";

export function getNavigationConfig(
  slug: string,
  options?: {
    brandImage?: { url: string | null; alt: string | null };
    featureToggles?: FeatureToggles;
  },
) {
  const base = `/${slug}`;
  const toggles = options?.featureToggles;

  // Build "Planning" group (Things To Do + Hotels)
  const planningLinks: { href: string; label: string }[] = [];
  if (toggles?.thingsToDo !== false) {
    planningLinks.push({ href: `${base}/things-to-do`, label: "Things To Do" });
  }
  if (toggles?.hotels !== false) {
    planningLinks.push({ href: `${base}/hotels`, label: "Hotels" });
  }
  if (toggles?.tripPlanner !== false) {
    planningLinks.push({ href: `${base}/trip-planner`, label: "Trip Planner" });
  }

  const rightLinks: NavItem[] = [];

  // Add Planning group if it has links
  if (planningLinks.length > 0) {
    rightLinks.push({ label: "Planning", links: planningLinks });
  }
  if (toggles?.registry !== false) {
    rightLinks.push({ href: `${base}/registry`, label: "Registry" });
  }
  rightLinks.push({ href: `${base}#rsvp`, label: "RSVP" });

  return {
    brandImage: {
      src: options?.brandImage?.url ?? "/nav.png",
      alt: options?.brandImage?.alt ?? "Wedding",
      width: 200,
      height: 100,
    },
    leftLinks: [
      { href: `${base}#story`, label: "Our Story" },
      { href: `${base}#details`, label: "Details" },
      { href: `${base}#schedule`, label: "Schedule" },
    ] as NavItem[],
    rightLinks,
  };
}
