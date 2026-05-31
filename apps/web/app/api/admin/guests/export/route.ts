import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getEmailFromAddress } from "@/lib/email/helpers";
import { sendEmail } from "@/lib/email/resend-client";
import {
  buildExportMatrix,
  normalizeColumnKeys,
} from "@/lib/export/guest-columns";
import { buildGuestExportWhere } from "@/lib/export/guest-filter";
import { exportRequestSchema, parseRecipients } from "@/lib/export/schema";
import {
  EXPORT_CONTENT_TYPES,
  exportFilename,
  toCsv,
  toXlsx,
} from "@/lib/export/serialize";

/**
 * Export the guest list as CSV or XLSX, either downloaded directly or emailed
 * as an attachment to wedding planners / the venue.
 *
 * @description Generate a filtered guest-list export (admin only)
 * @auth bearer
 * @tag Admin - Guests
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json().catch(() => null);
    const parsed = exportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const { format, delivery, columns, filters, recipients } = parsed.data;

    // Resolve recipients up front so an invalid address fails before we do the
    // (potentially large) export query.
    let toEmails: string[] = [];
    if (delivery === "email") {
      const { emails, invalid } = parseRecipients(recipients ?? "");
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid email address: ${invalid.join(", ")}` },
          { status: 400 },
        );
      }
      if (emails.length === 0) {
        return NextResponse.json(
          { error: "At least one recipient email is required" },
          { status: 400 },
        );
      }
      toEmails = emails;
    }

    const guests = await db.guest.findMany({
      where: buildGuestExportWhere(weddingId, filters),
      include: { party: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const matrix = buildExportMatrix(guests, normalizeColumnKeys(columns));
    const settings = await getWeddingSettings();
    const filename = exportFilename(settings.slug, format);

    const fileBytes =
      format === "csv"
        ? new TextEncoder().encode(toCsv(matrix))
        : await toXlsx(matrix);

    if (delivery === "download") {
      return new NextResponse(fileBytes as unknown as BodyInit, {
        headers: {
          "Content-Type": EXPORT_CONTENT_TYPES[format],
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(fileBytes.length),
        },
      });
    }

    // Email delivery — attach the export and send a short transactional note.
    const content = Buffer.from(fileBytes).toString("base64");
    const count = guests.length;
    const html = `
      <p>Hi,</p>
      <p>Attached is the latest guest list for <strong>${settings.coupleName}</strong>'s wedding (${count} guest${count === 1 ? "" : "s"}), exported on ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.</p>
      <p>File: <strong>${filename}</strong></p>
      <p>— Sent from the wedding admin dashboard</p>
    `;

    const { error } = await sendEmail({
      from: getEmailFromAddress(settings, "Guest List Export"),
      to: toEmails,
      subject: `Guest list export — ${settings.coupleName} (${count} guests)`,
      html,
      attachments: [{ filename, content }],
    });

    if (error) {
      console.error("Error emailing guest export:", error);
      return NextResponse.json(
        { error: "Failed to send export email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, count, recipients: toEmails });
  } catch (error) {
    console.error("Error in POST /api/admin/guests/export:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
