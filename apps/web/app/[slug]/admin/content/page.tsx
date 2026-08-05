import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getTemplateContentDefaults } from "@/lib/template-content-defaults";
import { getTemplatePreset } from "@/lib/templates";
import { ContentEditorClient } from "./content-editor-client";

export const dynamic = "force-dynamic";

export default async function ContentEditorPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const weddingId = await getWeddingId();
  const [settings, contentRows] = await Promise.all([
    getWeddingSettings(),
    db.weddingContent.findMany({ where: { weddingId } }),
  ]);
  const contentMap = Object.fromEntries(
    contentRows.map((r) => [r.section, r.content]),
  );
  // The hero headline is edited as the couple name for couple-names templates
  // (Elegant) — the same data the inline customizer threads into HeroEditor.
  const preset = getTemplatePreset(settings.templateId);
  const heroDisplay = preset.heroDisplay;
  const contentDefaults = getTemplateContentDefaults(preset.seedFlavor);

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <ContentEditorClient
          content={contentMap}
          coupleName={settings.coupleName}
          heroDisplay={heroDisplay}
          defaults={contentDefaults}
        />
      </div>
    </div>
  );
}
