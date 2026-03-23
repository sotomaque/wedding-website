import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAdminPhotos } from "@/lib/photos";
import { AdminPhotosClient } from "./photos-client";

export default async function AdminPhotosPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const photos = await getAdminPhotos();

  return <AdminPhotosClient initialPhotos={photos} />;
}
