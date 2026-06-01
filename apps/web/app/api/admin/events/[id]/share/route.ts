import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { weddingUrl } from "@/lib/url";
import { generateEventToken } from "@/lib/utils/event-token";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Mint (or return) the public RSVP share link for an event. The token is
 * generated lazily on first share and reused afterwards, so the link is stable.
 *
 * @description Get or create the public RSVP share link for an event
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Events
 * @openapi
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await context.params;

    const event = await db.event.findUnique({
      where: { id, weddingId },
      select: { id: true, publicRsvpToken: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    let token = event.publicRsvpToken;
    if (!token) {
      // Mint a unique token (collisions are astronomically unlikely; retry anyway).
      for (let i = 0; i < 5; i++) {
        const candidate = generateEventToken();
        const clash = await db.event.findUnique({
          where: { publicRsvpToken: candidate },
          select: { id: true },
        });
        if (!clash) {
          token = candidate;
          break;
        }
      }
      if (!token) {
        return NextResponse.json(
          { error: "Could not generate a share link, please try again." },
          { status: 500 },
        );
      }
      await db.event.update({
        where: { id },
        data: { publicRsvpToken: token },
      });
    }

    const settings = await getWeddingSettings();
    const url = weddingUrl(settings.slug, `/events/${token}`);

    return NextResponse.json({ token, url });
  } catch (error) {
    console.error("Error in POST /api/admin/events/[id]/share:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
