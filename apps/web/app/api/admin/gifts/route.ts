import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getEmailFromAddress } from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { sendEmail } from "@/lib/email/resend-client";
import { updateGiftSchema } from "@/lib/validations/admin-api";

const GIFT_TYPE_LABELS: Record<string, string> = {
  baby_fund: "Baby Fund",
  honeymoon: "Honeymoon Fund",
  student_loans: "Student Loans Fund",
};

/**
 * List all gifts
 * @description Get all gifts with guest info and totals (admin only)
 * @response 200:GiftListResponse
 * @auth bearer
 * @tag Admin - Gifts
 * @openapi
 */
export async function GET() {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    // Get all gifts with guest information via include relation
    const gifts = await db.gift.findMany({
      where: { weddingId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            inviteCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten guest info onto each gift for backwards compatibility
    const giftsWithGuest = gifts.map((gift) => ({
      ...gift,
      guestFirstName: gift.guest?.firstName ?? null,
      guestLastName: gift.guest?.lastName ?? null,
      guestInviteCode: gift.guest?.inviteCode ?? null,
    }));

    // Calculate totals
    const totals = {
      total_amount_cents: 0,
      by_type: {
        baby_fund: 0,
        honeymoon: 0,
        student_loans: 0,
        unknown: 0,
      },
      count: gifts.length,
      matched_to_guests: 0,
    };

    for (const gift of gifts) {
      if (gift.status === "completed") {
        totals.total_amount_cents += gift.amountCents;

        if (gift.giftType === "baby_fund") {
          totals.by_type.baby_fund += gift.amountCents;
        } else if (gift.giftType === "honeymoon") {
          totals.by_type.honeymoon += gift.amountCents;
        } else if (gift.giftType === "student_loans") {
          totals.by_type.student_loans += gift.amountCents;
        } else {
          totals.by_type.unknown += gift.amountCents;
        }

        if (gift.guestId) {
          totals.matched_to_guests++;
        }
      }
    }

    return NextResponse.json({ gifts: giftsWithGuest, totals });
  } catch (error) {
    console.error("Error in GET /api/admin/gifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Update a gift
 * @description Update a gift record, e.g. mark thank-you email sent or link to guest (admin only)
 * @body UpdateGiftBody
 * @response 200:UpdateGiftResponse
 * @auth bearer
 * @tag Admin - Gifts
 * @openapi
 */
export async function PATCH(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json().catch(() => null);
    const parsed = updateGiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Gift ID is required" },
        { status: 400 },
      );
    }
    const { id, thankYouEmailSent, guestId, notes } = parsed.data;

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (thankYouEmailSent !== undefined) {
      updates.thankYouEmailSent = thankYouEmailSent;
      if (thankYouEmailSent) {
        updates.thankYouEmailSentAt = new Date().toISOString();
      }
    }

    if (guestId !== undefined) {
      updates.guestId = guestId;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    // Check if gift exists and belongs to this wedding
    const existing = await db.gift.findUnique({ where: { id } });
    if (!existing || existing.weddingId !== weddingId) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    const updatedGift = await db.gift.update({
      where: { id },
      data: updates,
    });

    // Send the donor thank-you when an admin flips the flag false -> true and
    // the donor has an email. Best-effort: a send failure doesn't fail the
    // request (the flag reflects the admin's intent and is editable).
    if (
      thankYouEmailSent === true &&
      !existing.thankYouEmailSent &&
      existing.donorEmail?.includes("@")
    ) {
      try {
        const settings = await getWeddingSettings();
        const amount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: (existing.currency || "usd").toUpperCase(),
        }).format(existing.amountCents / 100);
        const rendered = await renderEmailTemplate(
          weddingId,
          "gift_thank_you",
          {
            DONOR_NAME: existing.donorName || "there",
            AMOUNT: amount,
            GIFT_TYPE: existing.giftType
              ? (GIFT_TYPE_LABELS[existing.giftType] ?? "gift")
              : "gift",
            COUPLE_NAMES: settings.coupleName,
          },
          settings.defaultLanguage,
        );
        if (rendered) {
          await sendEmail({
            from: getEmailFromAddress(settings, settings.coupleName),
            to: existing.donorEmail,
            subject: rendered.subject,
            html: rendered.html,
            log: {
              weddingId,
              guestId: existing.guestId ?? undefined,
              type: "gift_thank_you",
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending gift thank-you email:", emailError);
      }
    }

    return NextResponse.json({ gift: updatedGift });
  } catch (error) {
    console.error("Error in PATCH /api/admin/gifts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
