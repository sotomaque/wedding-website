import { currentUser } from "@clerk/nextjs/server";
import { env } from "@/env";
import { db } from "@/lib/db";

export interface GuestParty {
  inviteCode: string;
  primaryGuest: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    rsvpStatus: "pending" | "yes" | "no";
  };
  plusOne: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    rsvpStatus: "pending" | "yes" | "no";
  } | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

/**
 * Get the current guest party from either:
 * 1. Clerk session (if logged in and linked to a guest)
 * 2. Invite code (passed as parameter)
 *
 * Returns null if no valid guest found
 */
export async function getGuestParty(
  inviteCode?: string,
): Promise<GuestParty | null> {
  const user = await currentUser();

  // Check if user is admin
  const adminEmails =
    env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  const userEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  const isAdmin = userEmail ? adminEmails.includes(userEmail) : false;

  // Try to find guest by Clerk user ID first (if logged in)
  if (user) {
    const guestByClerk = await db
      .selectFrom("guests")
      .selectAll()
      .where("clerk_user_id", "=", user.id)
      .executeTakeFirst();

    if (guestByClerk) {
      // Found guest by Clerk ID - get their party
      return await getPartyByInviteCode(
        guestByClerk.invite_code,
        true,
        isAdmin,
      );
    }

    // If no clerk_user_id link, try to find guest by email and auto-link
    if (userEmail) {
      const guestByEmail = await db
        .selectFrom("guests")
        .selectAll()
        .where("email", "=", userEmail)
        .where("is_plus_one", "=", false) // Only match primary guests
        .executeTakeFirst();

      if (guestByEmail) {
        // Auto-link the Clerk user to this guest for future lookups
        await db
          .updateTable("guests")
          .set({ clerk_user_id: user.id })
          .where("id", "=", guestByEmail.id)
          .execute();

        return await getPartyByInviteCode(
          guestByEmail.invite_code,
          true,
          isAdmin,
        );
      }
    }
  }

  // Try to find guest by invite code
  if (inviteCode) {
    const party = await getPartyByInviteCode(inviteCode, !!user, isAdmin);
    return party;
  }

  // No valid session
  return null;
}

/**
 * Get the party (primary guest + plus one) by invite code
 */
async function getPartyByInviteCode(
  inviteCode: string,
  isLoggedIn: boolean,
  isAdmin: boolean,
): Promise<GuestParty | null> {
  const guests = await db
    .selectFrom("guests")
    .selectAll()
    .where("invite_code", "=", inviteCode.toUpperCase())
    .execute();

  if (guests.length === 0) {
    return null;
  }

  const primaryGuest = guests.find((g) => !g.is_plus_one);
  const plusOne = guests.find((g) => g.is_plus_one);

  if (!primaryGuest) {
    return null;
  }

  return {
    inviteCode: inviteCode.toUpperCase(),
    primaryGuest: {
      id: primaryGuest.id,
      firstName: primaryGuest.first_name,
      lastName: primaryGuest.last_name,
      email: primaryGuest.email,
      rsvpStatus: primaryGuest.rsvp_status,
    },
    plusOne: plusOne
      ? {
          id: plusOne.id,
          firstName: plusOne.first_name,
          lastName: plusOne.last_name,
          email: plusOne.email,
          rsvpStatus: plusOne.rsvp_status,
        }
      : null,
    isLoggedIn,
    isAdmin,
  };
}

/**
 * Link a Clerk user to a guest record
 * Called after a user logs in with an invite code
 */
export async function linkClerkUserToGuest(
  clerkUserId: string,
  inviteCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get guests with this invite code
    const guests = await db
      .selectFrom("guests")
      .selectAll()
      .where("invite_code", "=", inviteCode.toUpperCase())
      .execute();

    if (guests.length === 0) {
      return { success: false, error: "Invalid invite code" };
    }

    // Try to match by email
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    let matchingGuest = guests.find(
      (g) => g.email?.toLowerCase() === userEmail,
    );

    // If no email match, link to primary guest
    if (!matchingGuest) {
      matchingGuest = guests.find((g) => !g.is_plus_one);
    }

    if (!matchingGuest) {
      return { success: false, error: "Could not match guest" };
    }

    // Check if another user is already linked
    if (
      matchingGuest.clerk_user_id &&
      matchingGuest.clerk_user_id !== clerkUserId
    ) {
      return { success: false, error: "Guest already linked to another user" };
    }

    // Link the user
    await db
      .updateTable("guests")
      .set({ clerk_user_id: clerkUserId })
      .where("id", "=", matchingGuest.id)
      .execute();

    return { success: true };
  } catch (error) {
    console.error("Error linking Clerk user to guest:", error);
    return { success: false, error: "Failed to link account" };
  }
}
