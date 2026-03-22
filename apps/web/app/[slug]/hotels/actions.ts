"use server";

import { revalidatePath } from "next/cache";
import { getGuestParty } from "@/lib/auth/guest-session";
import { db } from "@/lib/db";
import { forWedding } from "@/lib/db/scoped";
import { getWeddingContext, getWeddingId } from "@/lib/db/wedding-context";

export interface Hotel {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  websiteUrl: string | null;
  phone: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  hotelType: "luxury" | "moderate" | "budget" | null;
  distanceToVenue: string | null;
  parkingInfo: string | null;
  amenities: string | null;
  displayOrder: number;
}

export interface HotelWithInterest extends Hotel {
  userInterest: {
    status: "interested" | "booked" | null;
    checkInDate: string | null;
    checkOutDate: string | null;
    numberOfRooms: number | null;
    notes: string | null;
  };
  interestedParties: {
    inviteCode: string;
    primaryName: string;
    plusOneName: string | null;
    status: "interested" | "booked";
    checkInDate: string | null;
    checkOutDate: string | null;
    numberOfRooms: number | null;
  }[];
}

/**
 * Get all hotels with interest data
 */
export async function getHotels(
  inviteCode?: string,
): Promise<HotelWithInterest[]> {
  const weddingId = await getWeddingId();

  // Get all hotels
  const hotels = await db
    .selectFrom("hotels")
    .selectAll()
    .where("wedding_id", "=", weddingId)
    .orderBy("display_order", "asc")
    .execute();

  // Get all interests with guest info
  const allInterests = await db
    .selectFrom("guest_hotel_interests as ghi")
    .innerJoin("guests as g", "g.id", "ghi.guest_id")
    .where("ghi.wedding_id", "=", weddingId)
    .select([
      "ghi.hotel_id",
      "ghi.invite_code",
      "ghi.status",
      "ghi.check_in_date",
      "ghi.check_out_date",
      "ghi.number_of_rooms",
      "g.first_name",
      "g.last_name",
      "g.is_plus_one",
    ])
    .execute();

  // Group interests by hotel and invite code
  const interestsByHotel = new Map<
    string,
    Map<
      string,
      {
        status: "interested" | "booked";
        checkInDate: string | null;
        checkOutDate: string | null;
        numberOfRooms: number | null;
        guests: {
          firstName: string;
          lastName: string | null;
          isPlusOne: boolean;
        }[];
      }
    >
  >();

  for (const interest of allInterests) {
    if (!interestsByHotel.has(interest.hotel_id)) {
      interestsByHotel.set(interest.hotel_id, new Map());
    }

    const hotelInterests = interestsByHotel.get(interest.hotel_id);
    if (!hotelInterests) continue;

    if (!hotelInterests.has(interest.invite_code)) {
      hotelInterests.set(interest.invite_code, {
        status: interest.status as "interested" | "booked",
        checkInDate: interest.check_in_date
          ? (new Date(interest.check_in_date).toISOString().split("T")[0] ??
            null)
          : null,
        checkOutDate: interest.check_out_date
          ? (new Date(interest.check_out_date).toISOString().split("T")[0] ??
            null)
          : null,
        numberOfRooms: interest.number_of_rooms,
        guests: [],
      });
    }

    hotelInterests.get(interest.invite_code)?.guests.push({
      firstName: interest.first_name,
      lastName: interest.last_name,
      isPlusOne: interest.is_plus_one,
    });
  }

  // Build response
  return hotels.map((hotel) => {
    const hotelInterests = interestsByHotel.get(hotel.id);
    const parties: HotelWithInterest["interestedParties"] = [];

    if (hotelInterests) {
      for (const [code, data] of hotelInterests) {
        const primary = data.guests.find((g) => !g.isPlusOne);
        const plusOne = data.guests.find((g) => g.isPlusOne);

        if (primary) {
          parties.push({
            inviteCode: code,
            primaryName: `${primary.firstName}${primary.lastName ? ` ${primary.lastName}` : ""}`,
            plusOneName: plusOne
              ? `${plusOne.firstName}${plusOne.lastName ? ` ${plusOne.lastName}` : ""}`
              : null,
            status: data.status,
            checkInDate: data.checkInDate,
            checkOutDate: data.checkOutDate,
            numberOfRooms: data.numberOfRooms,
          });
        }
      }
    }

    // Get user's interest if they have an invite code
    const userInterestData =
      inviteCode && hotelInterests
        ? hotelInterests.get(inviteCode.toUpperCase())
        : null;

    return {
      id: hotel.id,
      name: hotel.name,
      description: hotel.description,
      address: hotel.address,
      websiteUrl: hotel.website_url,
      phone: hotel.phone,
      imageUrl: hotel.image_url,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      hotelType: hotel.hotel_type,
      distanceToVenue: hotel.distance_to_venue,
      parkingInfo: hotel.parking_info,
      amenities: hotel.amenities,
      displayOrder: hotel.display_order,
      userInterest: {
        status: userInterestData?.status ?? null,
        checkInDate: userInterestData?.checkInDate ?? null,
        checkOutDate: userInterestData?.checkOutDate ?? null,
        numberOfRooms: userInterestData?.numberOfRooms ?? null,
        notes: null,
      },
      interestedParties: parties,
    };
  });
}

/**
 * Set interest in a hotel
 */
export async function setHotelInterest(params: {
  hotelId: string;
  inviteCode: string;
  status: "interested" | "booked" | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  numberOfRooms?: number | null;
  notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const {
    hotelId,
    inviteCode,
    status,
    checkInDate,
    checkOutDate,
    numberOfRooms,
    notes,
  } = params;

  try {
    const { weddingId, slug } = await getWeddingContext();
    const weddingDb = forWedding(weddingId);

    // Verify the invite code is valid
    const party = await getGuestParty(inviteCode);
    if (!party) {
      return { success: false, error: "Invalid invite code" };
    }

    const normalizedCode = inviteCode.toUpperCase();

    if (status === null) {
      // Remove interest
      await weddingDb
        .deleteFrom("guest_hotel_interests")
        .where("hotel_id", "=", hotelId)
        .where("invite_code", "=", normalizedCode)
        .execute();
    } else {
      // Check if interest already exists
      const existing = await db
        .selectFrom("guest_hotel_interests")
        .where("wedding_id", "=", weddingId)
        .select("id")
        .where("hotel_id", "=", hotelId)
        .where("invite_code", "=", normalizedCode)
        .executeTakeFirst();

      if (existing) {
        // Update existing
        await weddingDb
          .updateTable("guest_hotel_interests")
          .set({
            status,
            check_in_date: checkInDate || null,
            check_out_date: checkOutDate || null,
            number_of_rooms: numberOfRooms || null,
            notes: notes || null,
          })
          .where("id", "=", existing.id)
          .execute();
      } else {
        // Insert new - we need to insert for each guest in the party
        const guests = await db
          .selectFrom("guests")
          .where("wedding_id", "=", weddingId)
          .select("id")
          .where("invite_code", "=", normalizedCode)
          .execute();

        for (const guest of guests) {
          await weddingDb
            .insertInto("guest_hotel_interests", {
              guest_id: guest.id,
              hotel_id: hotelId,
              invite_code: normalizedCode,
              status,
              check_in_date: checkInDate || null,
              check_out_date: checkOutDate || null,
              number_of_rooms: numberOfRooms || null,
              notes: notes || null,
            })
            .execute();
        }

        // Send notification email to admin for new interest
        // Only send on first interest, not on updates
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/hotels/send-interest-notification`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                inviteCode: normalizedCode,
                hotelId,
              }),
            },
          );
        } catch (emailError) {
          console.error("Failed to send hotel interest email:", emailError);
          // Don't fail the whole operation if email fails
        }
      }
    }

    revalidatePath(`/${slug}/hotels`);
    return { success: true };
  } catch (error) {
    console.error("Error setting hotel interest:", error);
    return { success: false, error: "Failed to update interest" };
  }
}
