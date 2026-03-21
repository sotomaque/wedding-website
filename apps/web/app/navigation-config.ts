export function getNavigationConfig(slug: string) {
  const base = `/${slug}`;

  return {
    brandImage: {
      src: "/nav.png",
      alt: "H & E",
      width: 200,
      height: 100,
    },
    leftLinks: [
      { href: `${base}#story`, label: "Our Story" },
      { href: `${base}#details`, label: "Details" },
      { href: `${base}#schedule`, label: "Schedule" },
    ],
    rightLinks: [
      { href: `${base}/things-to-do`, label: "Things To Do" },
      { href: `${base}/trip-planner`, label: "Trip Planner" },
      { href: `${base}/hotels`, label: "Hotels" },
      { href: `${base}/vendors`, label: "Vendors" },
      { href: `${base}/registry`, label: "Registry" },
      { href: `${base}#rsvp`, label: "RSVP" },
    ],
  };
}

/** @deprecated Use getNavigationConfig(slug) instead */
export const NAVIGATION_CONFIG = getNavigationConfig("helen-and-enrique");
