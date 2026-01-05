import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gift Registry | Helen & Enrique's Wedding",
  description:
    "Contribute to our honeymoon fund, future family, or help us become debt-free. Your presence is our greatest gift.",
  openGraph: {
    title: "Gift Registry | Helen & Enrique's Wedding",
    description:
      "Contribute to our honeymoon fund, future family, or help us become debt-free. Your presence is our greatest gift.",
    type: "website",
  },
};

export default function RegistryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
