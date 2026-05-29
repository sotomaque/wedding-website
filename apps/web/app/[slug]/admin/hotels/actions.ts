"use server";

import type { HotelType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export type Hotel = {
  id: string;
  weddingId: string;
  name: string;
  description: string | null;
  address: string | null;
  websiteUrl: string | null;
  phone: string | null;
  imageUrl: string | null;
  distanceToVenue: string | null;
  hotelType: HotelType | null;
  displayOrder: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

interface HotelInput {
  name: string;
  description?: string;
  address?: string;
  websiteUrl?: string;
  phone?: string;
  imageUrl?: string;
  distanceToVenue?: string;
  hotelType?: HotelType | "";
}

export async function getHotels(): Promise<Hotel[]> {
  const weddingId = await getWeddingId();
  const rows = await db.hotel.findMany({
    where: { weddingId },
    orderBy: { displayOrder: "asc" },
  });
  return rows as Hotel[];
}

export async function createHotel(
  data: HotelInput,
): Promise<{ success: boolean; item?: Hotel; error?: string }> {
  const { weddingId, slug } = await getWeddingContext();
  const auth = await isAdmin(weddingId);
  if (!auth.authorized)
    return { success: false, error: auth.error ?? "Unauthorized" };

  const name = data.name.trim();
  if (!name) return { success: false, error: "Name is required" };

  try {
    const last = await db.hotel.aggregate({
      where: { weddingId },
      _max: { displayOrder: true },
    });

    const item = await db.hotel.create({
      data: {
        weddingId,
        name,
        description: data.description?.trim() || null,
        address: data.address?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        phone: data.phone?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        distanceToVenue: data.distanceToVenue?.trim() || null,
        hotelType: data.hotelType || null,
        displayOrder: (last._max.displayOrder ?? 0) + 1,
      },
    });

    revalidatePath(`/${slug}/admin/hotels`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/hotels`);

    return { success: true, item: item as Hotel };
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
    await db.hotel.update({
      where: { id, weddingId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        address: data.address?.trim() || null,
        websiteUrl: data.websiteUrl?.trim() || null,
        phone: data.phone?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        distanceToVenue: data.distanceToVenue?.trim() || null,
        hotelType: data.hotelType || null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/${slug}/admin/hotels`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/hotels`);

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
    await db.hotel.delete({ where: { id, weddingId } });
    revalidatePath(`/${slug}/admin/hotels`);
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/hotels`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting hotel:", error);
    return { success: false, error: "Failed to delete hotel" };
  }
}
