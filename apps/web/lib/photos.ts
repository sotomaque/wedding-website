import type { PhotoSection } from "@prisma/client";
import type { HeroPhoto } from "@/components/hero-section";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

export type { PhotoSection };

/** A library photo placed in a section, for the admin assignment UI. */
export interface AdminPlacement {
  placementId: string;
  photoId: string;
  displayOrder: number;
}

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

/**
 * Fetch the photos placed in a given section for the current wedding, ordered
 * by their per-section displayOrder. Placement is the sole visibility gate: a
 * photo shows here iff it has a placement in this section. Returns HeroPhoto[]
 * — the shape every section component consumes.
 */
export async function getPhotosBySection(
  section: PhotoSection,
): Promise<HeroPhoto[]> {
  try {
    const weddingId = await getWeddingId();

    const placements = await db.photoPlacement.findMany({
      where: { weddingId, section },
      orderBy: { displayOrder: "asc" },
      include: { photo: true },
    });

    return placements.map((placement) => ({
      src: placement.photo.url,
      alt: placement.photo.alt,
      description: placement.photo.description || placement.photo.alt,
    }));
  } catch (error) {
    console.error(`Error fetching photos for section "${section}":`, error);
    return [];
  }
}

/**
 * Fetch every placement for the current wedding, grouped by section, for the
 * admin assignment UI. Each section's list is ordered by displayOrder.
 */
export async function getPlacementsForAdmin(): Promise<
  Record<PhotoSection, AdminPlacement[]>
> {
  const weddingId = await getWeddingId();

  const placements = await db.photoPlacement.findMany({
    where: { weddingId },
    orderBy: { displayOrder: "asc" },
  });

  const grouped: Record<PhotoSection, AdminPlacement[]> = {
    hero: [],
    story: [],
    gallery: [],
  };

  for (const placement of placements) {
    grouped[placement.section].push({
      placementId: placement.id,
      photoId: placement.photoId,
      displayOrder: placement.displayOrder,
    });
  }

  return grouped;
}
