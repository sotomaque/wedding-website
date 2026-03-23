import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { GuestPhotosClient } from "./guest-photos-client";

export const metadata = {
  title: "Guest Photos — Admin",
};

export default async function GuestPhotosAdminPage() {
  const user = await currentUser();
  if (!user) redirect("/unauthorized");

  const { authorized } = await isAdmin();
  if (!authorized) redirect("/unauthorized");

  const weddingId = await getWeddingId();

  const photos = await db.guestPhoto.findMany({
    where: { weddingId },
    orderBy: { uploadedAt: "desc" },
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const uploadUrl = `${appUrl}/photos/upload`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-serif tracking-tight">Guest Photos</h1>
        <p className="text-muted-foreground text-sm">
          Photos uploaded by guests during the reception. Hide or delete any
          photo to remove it from the live slideshow.
        </p>
      </div>

      <GuestPhotosClient
        photos={photos.map((p) => ({
          id: p.id,
          url: p.url,
          uploaderName: p.uploaderName,
          isVisible: p.isVisible,
          uploadedAt: p.uploadedAt.toISOString(),
        }))}
        uploadUrl={uploadUrl}
      />
    </div>
  );
}
