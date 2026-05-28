import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hotels | Helen & Enrique",
  description:
    "Hotel recommendations near our wedding venue in San Diego. Find the perfect place to stay for our celebration.",
};

export default function HotelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
