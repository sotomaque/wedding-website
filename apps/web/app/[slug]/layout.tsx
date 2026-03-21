import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeddingBySlug } from "@/lib/db/wedding-context";

interface SlugLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const wedding = await getWeddingBySlug(slug);

  if (!wedding) {
    return { title: "Wedding Not Found" };
  }

  return {
    title: `${wedding.coupleName} | Wedding`,
    description: `Join us in celebrating the wedding of ${wedding.coupleName}! Find all the details about our ceremony, reception, and more.`,
    openGraph: {
      title: `${wedding.coupleName} | Wedding`,
      description: `Join us in celebrating the wedding of ${wedding.coupleName}!`,
      type: "website",
      siteName: `${wedding.coupleName}'s Wedding`,
    },
  };
}

export default async function SlugLayout({
  children,
  params,
}: SlugLayoutProps) {
  const { slug } = await params;
  const wedding = await getWeddingBySlug(slug);

  if (!wedding) {
    notFound();
  }

  return <>{children}</>;
}
