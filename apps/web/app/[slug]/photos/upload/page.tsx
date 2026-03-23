import { notFound } from "next/navigation";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { UploadClient } from "./upload-client";

export const metadata = {
  title: "Share Your Photos",
  description: "Upload photos from the wedding for everyone to enjoy",
};

export default async function UploadPage() {
  const settings = await getWeddingSettings();

  if (!settings.featureToggles.guestPhotos) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-12 bg-background">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-serif tracking-tight">
            Share Your Photos
          </h1>
          <p className="text-muted-foreground">
            Captured a moment? Upload it here and it'll appear on the live
            slideshow for everyone to see.
          </p>
        </div>

        <UploadClient />
      </div>
    </main>
  );
}
