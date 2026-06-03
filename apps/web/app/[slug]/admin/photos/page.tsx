import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getAdminPhotos, getPlacementsForAdmin } from "@/lib/photos";
import { getPhotoSections, getTemplatePreset } from "@/lib/templates";
import { AdminPhotosClient } from "./photos-client";

export default async function AdminPhotosPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [photos, settings, placements] = await Promise.all([
    getAdminPhotos(),
    getWeddingSettings(),
    getPlacementsForAdmin(),
  ]);

  // Only offer assignment for sections the active template actually renders
  // photos in (e.g. the Elegant template's story is prose-only).
  const template = getTemplatePreset(settings.templateId);
  const photoSections = getPhotoSections(template);

  return (
    <AdminPhotosClient
      initialPhotos={photos}
      photoSections={photoSections}
      initialPlacements={placements}
    />
  );
}
