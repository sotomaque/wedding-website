/**
 * Pure helpers for merging one guest into another.
 *
 * Kept DB-free so the conflict-resolution rules are unit-testable. The merge
 * endpoint applies these when folding a (usually self-registered) source guest
 * into an existing target guest.
 */

export type RsvpStatusValue = "yes" | "no" | "pending";

/**
 * Resolve the per-event RSVP status when both the source and target guest have
 * an invite to the same event. The source is the newer response, so it wins —
 * EXCEPT a pending source never overwrites a real yes/no the target already has.
 */
export function resolveMergedInviteStatus(
  source: string | null | undefined,
  target: string | null | undefined,
): RsvpStatusValue {
  const normalize = (s: string | null | undefined): RsvpStatusValue =>
    s === "yes" || s === "no" ? s : "pending";
  const src = normalize(source);
  if (src === "yes" || src === "no") return src;
  // Source is pending — keep the target's existing answer.
  return normalize(target);
}
