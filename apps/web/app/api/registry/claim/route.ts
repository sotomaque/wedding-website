import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
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
