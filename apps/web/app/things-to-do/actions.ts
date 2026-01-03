"use server";

import { revalidatePath } from "next/cache";
import { getGuestParty } from "@/lib/auth/guest-session";
import { db } from "@/lib/db";

export interface Activity {
  id: string;
  name: string;
  description: string;
  emoji: string | null;
  address: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isVenue: boolean;
  venueType: "ceremony" | "reception" | null;
  displayOrder: number;
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
  const activities = await db
    .selectFrom("activities")
    .selectAll()
    .orderBy("display_order", "asc")
    .execute();

  // Get all interests with guest info
  const allInterests = await db
    .selectFrom("guest_activity_interests as gai")
    .innerJoin("guests as g", "g.id", "gai.guest_id")
    .select([
      "gai.activity_id",
      "gai.invite_code",
      "gai.status",
      "gai.planned_date",
      "g.first_name",
      "g.last_name",
      "g.is_plus_one",
    ])
    .execute();

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
    if (!interestsByActivity.has(interest.activity_id)) {
      interestsByActivity.set(interest.activity_id, new Map());
    }

    const activityInterests = interestsByActivity.get(interest.activity_id);
    if (!activityInterests) continue;

    if (!activityInterests.has(interest.invite_code)) {
      activityInterests.set(interest.invite_code, {
        status: interest.status as "interested" | "committed",
        plannedDate: interest.planned_date
          ? (new Date(interest.planned_date).toISOString().split("T")[0] ??
            null)
          : null,
        guests: [],
      });
    }

    activityInterests.get(interest.invite_code)?.guests.push({
      firstName: interest.first_name,
      lastName: interest.last_name,
      isPlusOne: interest.is_plus_one,
    });
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
      imageUrl: activity.image_url,
      latitude: activity.latitude,
      longitude: activity.longitude,
      isVenue: activity.is_venue,
      venueType: activity.venue_type,
      displayOrder: activity.display_order,
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
      await db
        .deleteFrom("guest_activity_interests")
        .where("activity_id", "=", activityId)
        .where("invite_code", "=", normalizedCode)
        .execute();
    } else {
      // Check if interest already exists
      const existing = await db
        .selectFrom("guest_activity_interests")
        .select("id")
        .where("activity_id", "=", activityId)
        .where("invite_code", "=", normalizedCode)
        .executeTakeFirst();

      if (existing) {
        // Update existing
        await db
          .updateTable("guest_activity_interests")
          .set({
            status,
            planned_date: plannedDate || null,
          })
          .where("id", "=", existing.id)
          .execute();
      } else {
        // Insert new - we need to insert for each guest in the party
        const guests = await db
          .selectFrom("guests")
          .select("id")
          .where("invite_code", "=", normalizedCode)
          .execute();

        for (const guest of guests) {
          await db
            .insertInto("guest_activity_interests")
            .values({
              guest_id: guest.id,
              activity_id: activityId,
              invite_code: normalizedCode,
              status,
              planned_date: plannedDate || null,
            })
            .execute();
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
  const venues = await db
    .selectFrom("activities")
    .selectAll()
    .where("is_venue", "=", true)
    .orderBy("display_order", "asc")
    .execute();

  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    emoji: v.emoji,
    address: v.address,
    imageUrl: v.image_url,
    latitude: v.latitude,
    longitude: v.longitude,
    isVenue: v.is_venue,
    venueType: v.venue_type,
    displayOrder: v.display_order,
  }));
}
