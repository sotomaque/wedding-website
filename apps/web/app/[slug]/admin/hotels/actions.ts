"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type HotelType = "luxury" | "moderate" | "budget";

export type Hotel = {
  id: string;
  weddingId: string;
  name: string;
  description: string | null;
  address: string | null;
  websiteUrl: string | null;
  phone: string | null;
  imageUrl: string | null;
  hotelType: HotelType | null;
  distanceToVenue: string | null;
  parkingInfo: string | null;
  amenities: string | null;
  displayOrder: number | null;
};

export interface HotelInput {
  name: string;
  description?: string;
  address?: string;
  websiteUrl?: string;
  phone?: string;
  imageUrl?: string;
  hotelType?: HotelType | null;
  distanceToVenue?: string;
  parkingInfo?: string;
  amenities?: string;
}

const HOTEL_SELECT = {
  id: true,
  weddingId: true,
  name: true,
  description: true,
  address: true,
  websiteUrl: true,
  phone: true,
  imageUrl: true,
  hotelType: true,
  distanceToVenue: true,
  parkingInfo: true,
  amenities: true,
  displayOrder: true,
} as const;

function revalidateHotels(slug: string) {
  revalidatePath(`/${slug}/admin/hotels`);
  revalidatePath(`/${slug}/hotels`);
}

export async function getHotelsForAdmin(): Promise<Hotel[]> {
  try {
    const weddingId = await getWeddingId();
    const hotels = await db.hotel.findMany({
      where: { weddingId },
      orderBy: { displayOrder: "asc" },
      select: HOTEL_SELECT,
    });
    return hotels as Hotel[];
  } catch (error) {
    console.error("Error fetching hotels:", error);
    throw error;
  }
}

export async function createHotel(
  data: HotelInput,
): Promise<{ success: boolean; hotel?: Hotel; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const name = data.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    const last = await db.hotel.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const hotel = await db.hotel.create({
      data: {
        weddingId,
        name,
        description: data.description?.trim() || null,
        address: data.address?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        phone: data.phone?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        hotelType: data.hotelType ?? null,
        distanceToVenue: data.distanceToVenue?.trim() || null,
        parkingInfo: data.parkingInfo?.trim() || null,
        amenities: data.amenities?.trim() || null,
        displayOrder: (last._max.displayOrder ?? 0) + 1,
      },
      select: HOTEL_SELECT,
    });

    revalidateHotels(slug);
    return { success: true, hotel: hotel as Hotel };
  } catch (error) {
    console.error("Error creating hotel:", error);
    return { success: false, error: "Failed to create hotel" };
  }
}

export async function updateHotel(
  id: string,
  data: HotelInput,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    const name = data.name.trim();
    if (!name) return { success: false, error: "Name is required" };

    // Scope the update to this wedding so an admin can't edit another tenant's row.
    const result = await db.hotel.updateMany({
      where: { id, weddingId },
      data: {
        name,
        description: data.description?.trim() || null,
        address: data.address?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        phone: data.phone?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        hotelType: data.hotelType ?? null,
        distanceToVenue: data.distanceToVenue?.trim() || null,
        parkingInfo: data.parkingInfo?.trim() || null,
        amenities: data.amenities?.trim() || null,
        updatedAt: new Date(),
      },
    });
    if (result.count === 0) return { success: false, error: "Hotel not found" };

    revalidateHotels(slug);
    return { success: true };
  } catch (error) {
    console.error("Error updating hotel:", error);
    return { success: false, error: "Failed to update hotel" };
  }
}

export async function deleteHotel(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.hotel.deleteMany({ where: { id, weddingId } });
    revalidateHotels(slug);
    return { success: true };
  } catch (error) {
    console.error("Error deleting hotel:", error);
    return { success: false, error: "Failed to delete hotel" };
  }
}

export async function reorderHotels(
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  try {
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.hotel.updateMany({
          where: { id, weddingId },
          data: { displayOrder: index + 1, updatedAt: new Date() },
        }),
      ),
    );
    revalidateHotels(slug);
    return { success: true };
  } catch (error) {
    console.error("Error reordering hotels:", error);
    return { success: false, error: "Failed to reorder hotels" };
  }
}
