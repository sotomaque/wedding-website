import { env } from "@/env";
import { db } from "@/lib/db";
import { SlideshowClient } from "./slideshow-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Slideshow",
};

export default async function SlideshowPage() {
  const photos = await db
    .selectFrom("guest_photos")
    .selectAll()
    .where("is_visible", "=", true)
    .orderBy("uploaded_at", "desc")
    .execute();

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <SlideshowClient
      photos={photos.map((p) => ({
        id: p.id,
        url: p.url,
        uploader_name: p.uploader_name,
        uploaded_at: p.uploaded_at.toISOString(),
      }))}
      uploadUrl={`${appUrl}/photos/upload`}
    />
  );
}
