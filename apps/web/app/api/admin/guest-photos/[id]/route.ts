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
    const { isVisible } = body as { isVisible: boolean };

    // Check if photo exists first
    const existing = await db.guestPhoto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = await db.guestPhoto.update({
      where: { id },
      data: {
        isVisible,
        hiddenAt: isVisible ? null : new Date(),
        hiddenBy: isVisible ? null : auth.email,
      },
    });

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

    const existing = await db.guestPhoto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = await db.guestPhoto.delete({ where: { id } });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("Error in DELETE /api/admin/guest-photos/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
