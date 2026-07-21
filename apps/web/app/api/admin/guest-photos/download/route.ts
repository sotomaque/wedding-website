import JSZip from "jszip";
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { isAllowedUploadUrl } from "@/lib/uploadthing-url";

/**
 * Download all guest photos as a ZIP archive
 * @description Fetches all guest-submitted photos and returns them as a downloadable ZIP (admin only)
 * @response 200:ZipFile
 * @auth bearer
 * @tag Admin - Guest Photos
 * @openapi
 */
export async function GET(_request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const photos = await db.guestPhoto.findMany({
      where: { weddingId },
      select: { id: true, url: true, uploaderName: true, uploadedAt: true },
      orderBy: { uploadedAt: "asc" },
    });

    if (photos.length === 0) {
      return NextResponse.json(
        { error: "No photos to download" },
        { status: 404 },
      );
    }

    const zip = new JSZip();

    await Promise.all(
      photos.map(async (photo, i) => {
        try {
          // Defense-in-depth: never fetch a non-UploadThing URL server-side
          // (SSRF guard for any legacy/unvalidated rows).
          if (!isAllowedUploadUrl(photo.url)) return;
          const res = await fetch(photo.url);
          if (!res.ok) return;

          const buffer = await res.arrayBuffer();

          // Determine extension from content-type or URL
          const contentType = res.headers.get("content-type") ?? "image/jpeg";
          const ext = contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
              ? "webp"
              : contentType.includes("gif")
                ? "gif"
                : "jpg";

          const uploaderSlug = photo.uploaderName
            ? `_${photo.uploaderName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`
            : "";
          const filename = `photo-${String(i + 1).padStart(3, "0")}${uploaderSlug}.${ext}`;

          zip.file(filename, buffer);
        } catch {
          // Skip photos that fail to fetch rather than aborting the whole zip
        }
      }),
    );

    const zipBase64 = await zip.generateAsync({ type: "base64" });
    const zipBinary = Buffer.from(zipBase64, "base64");

    return new NextResponse(new Uint8Array(zipBinary) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="guest-photos.zip"`,
        "Content-Length": String(zipBinary.length),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/guest-photos/download:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
