import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank You! | Helen & Enrique's Wedding",
  description:
    "Thank you for your generous gift. We're so grateful for your kindness and support.",
  openGraph: {
    title: "Thank You! | Helen & Enrique's Wedding",
    description:
      "Thank you for your generous gift. We're so grateful for your kindness and support.",
    type: "website",
  },
};

export default function ThankYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
