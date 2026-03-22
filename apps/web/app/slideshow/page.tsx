import { env } from "@/env";
import { db } from "@/lib/db";
import { SlideshowClient } from "./slideshow-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Slideshow",
};

export default async function SlideshowPage() {
  const photos = await db.guestPhoto.findMany({
    where: { isVisible: true },
    orderBy: { uploadedAt: "desc" },
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <SlideshowClient
      photos={photos.map((p) => ({
        id: p.id,
        url: p.url,
        uploader_name: p.uploaderName,
        uploaded_at: p.uploadedAt.toISOString(),
      }))}
      uploadUrl={`${appUrl}/photos/upload`}
    />
  );
}
