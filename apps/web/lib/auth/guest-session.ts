import { currentUser } from "@clerk/nextjs/server";
import { isAdmin as checkIsAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

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
  const weddingId = await getWeddingId();

  // Check if user is admin
  const { authorized: isAdmin } = await checkIsAdmin(weddingId);

  // Try to find guest by Clerk user ID first (if logged in)
  if (user) {
    const guestByClerk = await db.guest.findFirst({
      where: { clerkUserId: user.id, weddingId },
    });

    if (guestByClerk?.inviteCode) {
      // Found guest by Clerk ID - get their party
      return await getPartyByInviteCode(
        guestByClerk.inviteCode,
        true,
        isAdmin,
        weddingId,
      );
    }

    // If no clerk_user_id link, try to find guest by email and auto-link
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (userEmail) {
      const guestByEmail = await db.guest.findFirst({
        where: {
          email: userEmail,
          isPlusOne: false, // Only match primary guests
          weddingId,
        },
      });

      if (guestByEmail?.inviteCode) {
        // Auto-link the Clerk user to this guest for future lookups
        await db.guest.update({
          where: { id: guestByEmail.id },
          data: { clerkUserId: user.id },
        });

        return await getPartyByInviteCode(
          guestByEmail.inviteCode,
          true,
          isAdmin,
          weddingId,
        );
      }
    }
  }

  // Try to find guest by invite code
  if (inviteCode) {
    const party = await getPartyByInviteCode(
      inviteCode,
      !!user,
      isAdmin,
      weddingId,
    );
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
  weddingId: string,
): Promise<GuestParty | null> {
  const guests = await db.guest.findMany({
    where: { inviteCode: inviteCode.toUpperCase(), weddingId },
  });

  if (guests.length === 0) {
    return null;
  }

  const primaryGuest = guests.find((g) => !g.isPlusOne);
  const plusOne = guests.find((g) => g.isPlusOne);

  if (!primaryGuest) {
    return null;
  }

  return {
    inviteCode: inviteCode.toUpperCase(),
    primaryGuest: {
      id: primaryGuest.id,
      firstName: primaryGuest.firstName,
      lastName: primaryGuest.lastName,
      email: primaryGuest.email,
      rsvpStatus: primaryGuest.rsvpStatus as "pending" | "yes" | "no",
    },
    plusOne: plusOne
      ? {
          id: plusOne.id,
          firstName: plusOne.firstName,
          lastName: plusOne.lastName,
          email: plusOne.email,
          rsvpStatus: plusOne.rsvpStatus as "pending" | "yes" | "no",
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

    const weddingId = await getWeddingId();

    // Get guests with this invite code
    const guests = await db.guest.findMany({
      where: { inviteCode: inviteCode.toUpperCase(), weddingId },
    });

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
      matchingGuest = guests.find((g) => !g.isPlusOne);
    }

    if (!matchingGuest) {
      return { success: false, error: "Could not match guest" };
    }

    // Check if another user is already linked
    if (
      matchingGuest.clerkUserId &&
      matchingGuest.clerkUserId !== clerkUserId
    ) {
      return { success: false, error: "Guest already linked to another user" };
    }

    // Link the user
    await db.guest.update({
      where: { id: matchingGuest.id },
      data: { clerkUserId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error linking Clerk user to guest:", error);
    return { success: false, error: "Failed to link account" };
  }
}
