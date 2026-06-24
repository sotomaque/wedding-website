import type { User } from "@clerk/nextjs/server";

/**
 * The user's verified PRIMARY email address, lowercased — or null when the user
 * has no verified primary email.
 *
 * Authorization decisions MUST use this, never `user.emailAddresses[0]`: a Clerk
 * user can add an arbitrary email address to their account that is still
 * UNVERIFIED, and it appears in `emailAddresses`. Matching wedding_admins /
 * ADMIN_EMAILS / guest emails against an unverified (or non-primary) address is
 * an account-takeover bypass — an attacker adds a victim's email (unverified)
 * and matches a pre-seeded admin/guest row.
 */
export function getVerifiedPrimaryEmail(
  user: Pick<User, "primaryEmailAddressId" | "emailAddresses">,
): string | null {
  const primary = user.emailAddresses.find(
    (e) =>
      e.id === user.primaryEmailAddressId &&
      e.verification?.status === "verified",
  );
  return primary?.emailAddress.toLowerCase() ?? null;
}
