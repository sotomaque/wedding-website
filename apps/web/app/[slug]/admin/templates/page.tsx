import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { fetchTemplates } from "@/lib/templates/fetch-templates";
import { TemplatesClient } from "./templates-client";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const weddingId = await getWeddingId();
  const [templates, wedding] = await Promise.all([
    fetchTemplates(weddingId),
    db.wedding.findUnique({
      where: { id: weddingId },
      select: { defaultLanguage: true, slug: true },
    }),
  ]);

  return (
    <TemplatesClient
      initialTemplates={templates}
      defaultLanguage={(wedding?.defaultLanguage as "en" | "es") ?? "en"}
      slug={wedding?.slug ?? ""}
    />
  );
}
