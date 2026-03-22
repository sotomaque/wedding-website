"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getGuestParty } from "@/lib/auth/guest-session";
import { db } from "@/lib/db";

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  address: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isVenue: boolean | null;
  venueType: "ceremony" | "reception" | string | null;
  displayOrder: number | null;
}

export interface ActivityWithInterest extends Activity {
  userInterest: {
    status: "interested" | "committed" | null;
    plannedDate: string | null;
  };
  interestedParties: {
    inviteCode: string;
    primaryName: string;
    plusOneName: string | null;
    status: "interested" | "committed";
    plannedDate: string | null;
  }[];
}

/**
 * Get all activities with interest data
 */
export async function getActivities(
  inviteCode?: string,
): Promise<ActivityWithInterest[]> {
  // Get all activities
  const activities = await db.activity.findMany({
    orderBy: { displayOrder: "asc" },
  });

  // Get all interests with guest info
  const allInterests = await db.guestActivityInterest.findMany({
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

  // Group interests by activity and invite code
  const interestsByActivity = new Map<
    string,
    Map<
      string,
      {
        status: "interested" | "committed";
        plannedDate: string | null;
        guests: {
          firstName: string;
          lastName: string | null;
          isPlusOne: boolean;
        }[];
      }
    >
  >();

  for (const interest of allInterests) {
    if (!interestsByActivity.has(interest.activityId)) {
      interestsByActivity.set(interest.activityId, new Map());
    }

    const activityInterests = interestsByActivity.get(interest.activityId);
    if (!activityInterests) continue;

    const invCode = interest.inviteCode;
    if (!invCode) continue;

    if (!activityInterests.has(invCode)) {
      activityInterests.set(invCode, {
        status: interest.status as "interested" | "committed",
        plannedDate: interest.plannedDate
          ? (new Date(String(interest.plannedDate))
              .toISOString()
              .split("T")[0] ?? null)
          : null,
        guests: [],
      });
    }

    if (interest.guest) {
      activityInterests.get(invCode)?.guests.push({
        firstName: interest.guest.firstName,
        lastName: interest.guest.lastName,
        isPlusOne: interest.guest.isPlusOne,
      });
    }
  }

  // Build response
  return activities.map((activity) => {
    const activityInterests = interestsByActivity.get(activity.id);
    const parties: ActivityWithInterest["interestedParties"] = [];

    if (activityInterests) {
      for (const [code, data] of activityInterests) {
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
            plannedDate: data.plannedDate,
          });
        }
      }
    }

    // Get user's interest if they have an invite code
    const userInterestData =
      inviteCode && activityInterests
        ? activityInterests.get(inviteCode.toUpperCase())
        : null;

    return {
      id: activity.id,
      name: activity.name,
      description: activity.description,
      emoji: activity.emoji,
      address: activity.address,
      imageUrl: activity.imageUrl,
      latitude: activity.latitude ? Number(activity.latitude) : null,
      longitude: activity.longitude ? Number(activity.longitude) : null,
      isVenue: activity.isVenue,
      venueType: activity.venueType,
      displayOrder: activity.displayOrder,
      userInterest: {
        status: userInterestData?.status ?? null,
        plannedDate: userInterestData?.plannedDate ?? null,
      },
      interestedParties: parties,
    };
  });
}

/**
 * Set interest in an activity
 */
export async function setActivityInterest(params: {
  activityId: string;
  inviteCode: string;
  status: "interested" | "committed" | null;
  plannedDate?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const { activityId, inviteCode, status, plannedDate } = params;

  try {
    // Verify the invite code is valid
    const party = await getGuestParty(inviteCode);
    if (!party) {
      return { success: false, error: "Invalid invite code" };
    }

    const normalizedCode = inviteCode.toUpperCase();

    if (status === null) {
      // Remove interest
      await db.guestActivityInterest.deleteMany({
        where: {
          activityId,
          inviteCode: normalizedCode,
        },
      });
    } else {
      // Check if interest already exists
      const existing = await db.guestActivityInterest.findFirst({
        where: {
          activityId,
          inviteCode: normalizedCode,
        },
        select: { id: true },
      });

      if (existing) {
        // Update existing
        await db.guestActivityInterest.updateMany({
          where: {
            activityId,
            inviteCode: normalizedCode,
          },
          data: {
            status,
            plannedDate: plannedDate || null,
          },
        });
      } else {
        // Insert new - we need to insert for each guest in the party
        const guests = await db.guest.findMany({
          where: { inviteCode: normalizedCode },
          select: { id: true },
        });

        for (const guest of guests) {
          await db.guestActivityInterest.create({
            data: {
              guestId: guest.id,
              activityId,
              inviteCode: normalizedCode,
              status,
              plannedDate: plannedDate || null,
            },
          });
        }
      }
    }

    revalidatePath("/things-to-do");
    return { success: true };
  } catch (error) {
    console.error("Error setting activity interest:", error);
    return { success: false, error: "Failed to update interest" };
  }
}

/**
 * Get venues (ceremony and reception locations)
 */
export async function getVenues(): Promise<Activity[]> {
  const venues = await db.activity.findMany({
    where: { isVenue: true },
    orderBy: { displayOrder: "asc" },
  });

  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    emoji: v.emoji,
    address: v.address,
    imageUrl: v.imageUrl,
    latitude: v.latitude ? Number(v.latitude) : null,
    longitude: v.longitude ? Number(v.longitude) : null,
    isVenue: v.isVenue,
    venueType: v.venueType,
    displayOrder: v.displayOrder,
  }));
}

/**
 * Get beaches with interest data
 */
export async function getBeaches(
  inviteCode?: string,
): Promise<ActivityWithInterest[]> {
  // Beach activities are identified by their emojis
  const beachEmojis = ["🏖️", "🌊", "🏄"];

  const allActivities = await getActivities(inviteCode);

  // Filter for beaches
  return allActivities.filter(
    (activity) =>
      !activity.isVenue &&
      activity.emoji &&
      beachEmojis.includes(activity.emoji),
  );
}

/**
 * Search guests by name for the guest identifier autocomplete
 */
export async function searchGuests(query: string): Promise<{
  success: boolean;
  results: { inviteCode: string; name: string }[];
  error?: string;
}> {
  try {
    if (!query || query.length < 2) return { success: true, results: [] };

    const guests = await db.guest.findMany({
      where: {
        isPlusOne: false,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        firstName: true,
        lastName: true,
        inviteCode: true,
      },
      take: 10,
    });

    return {
      success: true,
      results: guests
        .filter((g) => g.inviteCode !== null)
        .map((g) => ({
          inviteCode: g.inviteCode as string,
          name: `${g.firstName} ${g.lastName ?? ""}`.trim(),
        })),
    };
  } catch (error) {
    console.error("Error searching guests:", error);
    return { success: false, results: [], error: "Failed to search guests" };
  }
}

/**
 * Set the invite_code cookie so unauthed users can interact with activities
 */
export async function setInviteCodeCookie(
  inviteCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!inviteCode)
      return { success: false, error: "Invite code is required" };

    // Validate the invite code exists
    const party = await db.guest.findFirst({
      where: { inviteCode: inviteCode.toUpperCase() },
      select: { inviteCode: true },
    });

    if (!party) {
      return { success: false, error: "Invalid invite code" };
    }

    const cookieStore = await cookies();
    cookieStore.set("invite_code", inviteCode.toUpperCase(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
    });
    revalidatePath("/things-to-do");
    return { success: true };
  } catch (error) {
    console.error("Error setting invite code cookie:", error);
    return { success: false, error: "Failed to set invite code" };
  }
}
