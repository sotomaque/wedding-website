import { after, type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import {
  getEmailFromAddress,
  getNotificationRecipients,
} from "@/lib/email/helpers";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { getResendClient, sendEmail } from "@/lib/email/resend-client";
import { weddingUrl } from "@/lib/url";
import {
  registryClaimSchema,
  registryUnclaimSchema,
} from "@/lib/validations/registry";

/**
 * Claim a registry product item ("I'm giving this"). Public, no login —
 * the guest provides a name + email. Race-safe: the conditional updateMany
 * only succeeds while the item is an unclaimed, active product belonging to
 * this wedding, so two simultaneous claims can't both win.
 *
 * @description Claim a registry product item
 * @body RegistryClaimBody
 * @response 200:SuccessResponse
 * @tag Registry
 * @openapi
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const body = await request.json().catch(() => null);
    const parsed = registryClaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const { itemId, name, email } = parsed.data;

    const result = await db.registryItem.updateMany({
      where: {
        id: itemId,
        weddingId,
        itemType: "product",
        isActive: true,
        claimedAt: null,
      },
      data: {
        claimedByName: name,
        claimedByEmail: email.toLowerCase(),
        claimedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Either already claimed, not a product, inactive, or wrong wedding.
      return NextResponse.json(
        { error: "This gift has already been claimed." },
        { status: 409 },
      );
    }

    // Notify the couple in the background — best-effort, never blocks the claim.
    after(async () => {
      try {
        if (!getResendClient()) return;
        const item = await db.registryItem.findFirst({
          where: { id: itemId, weddingId },
          select: { title: true },
        });
        const settings = await getWeddingSettings();
        const recipients = getNotificationRecipients(settings);
        if (recipients.length === 0) return;

        const rendered = await renderEmailTemplate(
          weddingId,
          "registry_claim_notification",
          {
            CLAIMANT_NAME: name,
            CLAIMANT_EMAIL: email,
            ITEM_TITLE: item?.title ?? "a registry item",
            ADMIN_URL: weddingUrl(settings.slug, "/admin/registry"),
          },
          settings.defaultLanguage,
        );
        if (rendered) {
          await sendEmail({
            from: getEmailFromAddress(settings, "Wedding Registry"),
            to: recipients,
            subject: rendered.subject,
            html: rendered.html,
            log: { weddingId, type: "registry_claim_notification" },
          });
        }
      } catch (emailError) {
        console.error("Error sending registry claim notification:", emailError);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/registry/claim:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Release a claim the guest made earlier, verified by the claiming email.
 *
 * @description Release a registry claim (by claimant email)
 * @body RegistryUnclaimBody
 * @response 200:SuccessResponse
 * @tag Registry
 * @openapi
 */
export async function DELETE(request: NextRequest) {
  try {
    const weddingId = await getWeddingId();
    const body = await request.json().catch(() => null);
    const parsed = registryUnclaimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const { itemId, email } = parsed.data;

    const result = await db.registryItem.updateMany({
      where: { id: itemId, weddingId, claimedByEmail: email.toLowerCase() },
      data: {
        claimedByName: null,
        claimedByEmail: null,
        claimedAt: null,
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "No matching claim found for that email." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/registry/claim:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
