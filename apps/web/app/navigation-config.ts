import type { FeatureToggles } from "@/lib/validations/wedding-content";

export function getNavigationConfig(
  slug: string,
  options?: {
    brandImage?: { url: string | null; alt: string | null };
    featureToggles?: FeatureToggles;
  },
) {
  const base = `/${slug}`;

  const rightLinks: { href: string; label: string }[] = [];

  const toggles = options?.featureToggles;

  if (toggles?.thingsToDo !== false) {
    rightLinks.push({ href: `${base}/things-to-do`, label: "Things To Do" });
  }
  if (toggles?.tripPlanner !== false) {
    rightLinks.push({ href: `${base}/trip-planner`, label: "Trip Planner" });
  }
  if (toggles?.hotels !== false) {
    rightLinks.push({ href: `${base}/hotels`, label: "Hotels" });
  }
  if (toggles?.vendors !== false) {
    rightLinks.push({ href: `${base}/vendors`, label: "Vendors" });
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
    ],
    rightLinks,
  };
}
