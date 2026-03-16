import { currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

async function getAdminEmail(
  _request: NextRequest,
): Promise<{ email: string } | NextResponse> {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
    e.trim().toLowerCase(),
  );
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase() ?? "";

  if (!adminEmails?.includes(userEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { email: userEmail };
}

/**
 * Toggle guest photo visibility
 * @description Hide or show a guest-submitted photo (admin only)
 * @body ToggleGuestPhotoBody
 * @response 200:GuestPhotoResponse
 * @auth bearer
 * @tag Admin - Guest Photos
 * @openapi
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAdminEmail(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const { is_visible } = body as { is_visible: boolean };

    const photo = await db
      .updateTable("guest_photos")
      .set({
        is_visible,
        hidden_at: is_visible ? null : new Date(),
        hidden_by: is_visible ? null : auth.email,
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in PATCH /api/admin/guest-photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Delete a guest photo
 * @description Permanently delete a guest-submitted photo (admin only)
 * @response 200:DeleteGuestPhotoResponse
 * @auth bearer
 * @tag Admin - Guest Photos
 * @openapi
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAdminEmail(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const photo = await db
      .deleteFrom("guest_photos")
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in DELETE /api/admin/guest-photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
