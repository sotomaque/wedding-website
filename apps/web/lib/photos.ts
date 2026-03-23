import type { HeroPhoto } from "@/components/hero-section";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

export interface Photo {
  id: string;
  url: string;
  alt: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Fetch all active photos from the database for the current wedding.
 */
export async function getAllPhotos(): Promise<HeroPhoto[]> {
  try {
    const weddingId = await getWeddingId();

    // Fetch active photos from database, ordered by displayOrder
    const dbPhotos = await db.photo.findMany({
      where: { isActive: true, weddingId },
      orderBy: { displayOrder: "asc" },
    });

    // Convert DB photos to HeroPhoto format
    const convertedDbPhotos: HeroPhoto[] = dbPhotos.map((photo) => ({
      src: photo.url,
      alt: photo.alt,
      description: photo.description || photo.alt,
    }));

    return convertedDbPhotos;
  } catch (error) {
    console.error("Error fetching photos from database:", error);
    return [];
  }
}

/**
 * Fetch all photos for admin (including inactive)
 * Server-side function that directly queries the database
 */
export async function getAdminPhotos(): Promise<Photo[]> {
  const weddingId = await getWeddingId();

  const photos = await db.photo.findMany({
    where: { weddingId },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });

  return photos as unknown as Photo[];
}
