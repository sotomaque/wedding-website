"use server";

import { revalidatePath } from "next/cache";
import { getGuestParty } from "@/lib/auth/guest-session";
import { db } from "@/lib/db";

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
  hotelType: string | null;
  distanceToVenue: string | null;
  parkingInfo: string | null;
  amenities: string | null;
  displayOrder: number | null;
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
  // Get all hotels
  const hotels = await db.hotel.findMany({
    orderBy: { displayOrder: "asc" },
  });

  // Get all interests with guest info
  const allInterests = await db.guestHotelInterest.findMany({
    include: {
      guest: {
        select: {
          firstName: true,
          lastName: true,
          isPlusOne: true,
        },
      },
    },
  });

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
    const invCode = interest.inviteCode;
    if (!invCode || !interest.hotelId) continue;

    if (!interestsByHotel.has(interest.hotelId)) {
      interestsByHotel.set(interest.hotelId, new Map());
    }

    const hotelInterests = interestsByHotel.get(interest.hotelId);
    if (!hotelInterests) continue;

    if (!hotelInterests.has(invCode)) {
      hotelInterests.set(invCode, {
        status: interest.status as "interested" | "booked",
        checkInDate: interest.checkInDate
          ? (new Date(String(interest.checkInDate))
              .toISOString()
              .split("T")[0] ?? null)
          : null,
        checkOutDate: interest.checkOutDate
          ? (new Date(String(interest.checkOutDate))
              .toISOString()
              .split("T")[0] ?? null)
          : null,
        numberOfRooms: interest.numberOfRooms,
        guests: [],
      });
    }

    if (interest.guest) {
      hotelInterests.get(invCode)?.guests.push({
        firstName: interest.guest.firstName,
        lastName: interest.guest.lastName,
        isPlusOne: interest.guest.isPlusOne,
      });
    }
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
      websiteUrl: hotel.websiteUrl,
      phone: hotel.phone,
      imageUrl: hotel.imageUrl,
      latitude: hotel.latitude ? Number(hotel.latitude) : null,
      longitude: hotel.longitude ? Number(hotel.longitude) : null,
      hotelType: hotel.hotelType,
      distanceToVenue: hotel.distanceToVenue,
      parkingInfo: hotel.parkingInfo,
      amenities: hotel.amenities,
      displayOrder: hotel.displayOrder,
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
    // Verify the invite code is valid
    const party = await getGuestParty(inviteCode);
    if (!party) {
      return { success: false, error: "Invalid invite code" };
    }

    const normalizedCode = inviteCode.toUpperCase();

    if (status === null) {
      // Remove interest
      await db.guestHotelInterest.deleteMany({
        where: {
          hotelId,
          inviteCode: normalizedCode,
        },
      });
    } else {
      // Check if interest already exists
      const existing = await db.guestHotelInterest.findFirst({
        where: {
          hotelId,
          inviteCode: normalizedCode,
        },
        select: { id: true },
      });

      if (existing) {
        // Update existing
        await db.guestHotelInterest.updateMany({
          where: {
            hotelId,
            inviteCode: normalizedCode,
          },
          data: {
            status,
            checkInDate: checkInDate || null,
            checkOutDate: checkOutDate || null,
            numberOfRooms: numberOfRooms || null,
            notes: notes || null,
          },
        });
      } else {
        // Insert new - we need to insert for each guest in the party
        const guests = await db.guest.findMany({
          where: { inviteCode: normalizedCode },
          select: { id: true },
        });

        for (const guest of guests) {
          await db.guestHotelInterest.create({
            data: {
              guestId: guest.id,
              hotelId,
              inviteCode: normalizedCode,
              status,
              checkInDate: checkInDate || null,
              checkOutDate: checkOutDate || null,
              numberOfRooms: numberOfRooms || null,
              notes: notes || null,
            },
          });
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

    revalidatePath("/hotels");
    return { success: true };
  } catch (error) {
    console.error("Error setting hotel interest:", error);
    return { success: false, error: "Failed to update interest" };
  }
}
