import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingBySlug } from "@/lib/db/wedding-context";
import { generateThemeCss, getThemePreset } from "@/lib/themes";

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

  // Load theme for this wedding
  const weddingRecord = await db.wedding.findUnique({
    where: { id: wedding.weddingId },
    select: { themeId: true },
  });
  const theme = getThemePreset(weddingRecord?.themeId);
  const themeCss = generateThemeCss(theme);

  return (
    <>
      {themeCss && (
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: theme CSS variables are controlled server-side from preset definitions
          dangerouslySetInnerHTML={{
            __html: themeCss,
          }}
        />
      )}
      {children}
    </>
  );
}
