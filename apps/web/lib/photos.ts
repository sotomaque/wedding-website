import { HERO_PHOTOS, type HeroPhoto } from "@/app/constants";
import { db } from "@/lib/db";

export interface Photo {
  id: string;
  url: string;
  alt: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Fetch all photos: static HERO_PHOTOS combined with active database photos
 * This is a server-side function that directly queries the database
 */
export async function getAllPhotos(): Promise<HeroPhoto[]> {
  try {
    // Fetch active photos from database, ordered by display_order
    const dbPhotos = await db
      .selectFrom("photos")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("display_order", "asc")
      .execute();

    // Convert DB photos to HeroPhoto format
    const convertedDbPhotos: HeroPhoto[] = dbPhotos.map((photo) => ({
      src: photo.url,
      alt: photo.alt,
      description: photo.description || photo.alt,
    }));

    // Combine static photos with database photos
    return [...HERO_PHOTOS, ...convertedDbPhotos];
  } catch (error) {
    // If database query fails, fall back to static photos only
    console.error("Error fetching photos from database:", error);
    return [...HERO_PHOTOS];
  }
}

/**
 * Fetch all photos for admin (including inactive)
 * Server-side function that directly queries the database
 */
export async function getAdminPhotos(): Promise<Photo[]> {
  const photos = await db
    .selectFrom("photos")
    .selectAll()
    .orderBy("display_order", "asc")
    .orderBy("created_at", "desc")
    .execute();

  return photos;
}
