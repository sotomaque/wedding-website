import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Itinerary | Helen & Enrique's Wedding",
  description:
    "The full wedding-week itinerary — beach day, sightseeing, the ceremony, and more. See the details and let us know you're coming, no account needed.",
  openGraph: {
    title: "Itinerary | Helen & Enrique's Wedding",
    description:
      "The full wedding-week itinerary — beach day, sightseeing, the ceremony, and more. See the details and let us know you're coming.",
    type: "website",
  },
};

export default function ItineraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
