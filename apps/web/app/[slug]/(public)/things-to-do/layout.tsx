import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Things to Do in San Diego | Helen & Enrique's Wedding",
  description:
    "Discover our favorite spots in San Diego! From beautiful beaches to amazing restaurants, find the best things to do while you're in town for our wedding.",
  openGraph: {
    title: "Things to Do in San Diego | Helen & Enrique's Wedding",
    description:
      "Discover our favorite spots in San Diego! From beautiful beaches to amazing restaurants, find the best things to do while you're in town for our wedding.",
    type: "website",
  },
};

export default function ThingsToDoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
