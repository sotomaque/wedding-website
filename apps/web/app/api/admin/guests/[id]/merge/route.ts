import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { resolveMergedInviteStatus } from "@/lib/db/admin/merge-guests";
import { getWeddingId } from "@/lib/db/wedding-context";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Merge a source guest into an existing target guest, then delete the source.
 * Used to clean up self-registered guests (and other duplicates).
 *
 * Per-event invites move to the target, deduping on (guest, event): when both
 * have an invite for an event the newer source response wins, except a pending
 * source never overwrites a real yes/no. Plus-ones, gifts, and the email log
 * are re-pointed to the target so nothing is lost.
 *
 * @description Merge a guest into another guest
 * @pathParams IdParams
 * @body MergeGuestBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id: sourceId } = await context.params;
    const body = await request.json().catch(() => null);
    const targetId =
      body && typeof body.targetGuestId === "string"
        ? body.targetGuestId
        : null;

    if (!targetId) {
      return NextResponse.json(
        { error: "A target guest is required." },
        { status: 400 },
      );
    }
    if (targetId === sourceId) {
      return NextResponse.json(
        { error: "Can't merge a guest into themselves." },
        { status: 400 },
      );
    }

    const [source, target] = await Promise.all([
      db.guest.findFirst({ where: { id: sourceId, weddingId } }),
      db.guest.findFirst({ where: { id: targetId, weddingId } }),
    ]);
    if (!source || !target) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      const [sourceInvites, targetInvites] = await Promise.all([
        tx.guestEventInvite.findMany({
          where: { guestId: sourceId },
          select: { id: true, eventId: true, rsvpStatus: true },
        }),
        tx.guestEventInvite.findMany({
          where: { guestId: targetId },
          select: { eventId: true, rsvpStatus: true },
        }),
      ]);
      const targetByEvent = new Map(
        targetInvites.map((i) => [i.eventId, i.rsvpStatus]),
      );

      for (const invite of sourceInvites) {
        const targetStatus = targetByEvent.get(invite.eventId);
        if (targetStatus === undefined) {
          // Target wasn't invited to this event — move the invite over.
          await tx.guestEventInvite.update({
            where: { id: invite.id },
            data: { guestId: targetId },
          });
        } else {
          // Both invited — resolve the winning status onto the target's invite.
          // The source invite is removed with the source guest below.
          const merged = resolveMergedInviteStatus(
            invite.rsvpStatus,
            targetStatus,
          );
          if (merged !== targetStatus) {
            await tx.guestEventInvite.updateMany({
              where: { guestId: targetId, eventId: invite.eventId },
              data: { rsvpStatus: merged },
            });
          }
        }
      }

      // Re-point everything else worth keeping to the target.
      await tx.guest.updateMany({
        where: { primaryGuestId: sourceId },
        data: { primaryGuestId: targetId },
      });
      await tx.gift.updateMany({
        where: { guestId: sourceId },
        data: { guestId: targetId },
      });
      await tx.emailLog.updateMany({
        where: { guestId: sourceId },
        data: { guestId: targetId },
      });

      // Deleting the source cascades its remaining (conflicting) invites and any
      // activity/hotel/table records left behind.
      await tx.guest.delete({ where: { id: sourceId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/[id]/merge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
