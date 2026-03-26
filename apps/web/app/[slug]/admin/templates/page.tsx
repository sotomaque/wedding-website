import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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
  const templates = await fetchTemplates(weddingId);

  return <TemplatesClient initialTemplates={templates} />;
}
