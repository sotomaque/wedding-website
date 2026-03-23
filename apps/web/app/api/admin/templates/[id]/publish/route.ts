import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getWeddingId } from "@/lib/db/wedding-context";
import { getResendClient } from "@/lib/email/resend-client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Publish email template
 * @description Publish a draft email template in Resend, making it available for sending
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Templates
 * @openapi
 */
export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const { data, error } = await resend.templates.publish(id);

    if (error) {
      console.error("Error publishing template:", error);
      return NextResponse.json(
        { error: error.message || "Failed to publish template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error("Error publishing template:", error);
    return NextResponse.json(
      { error: "Failed to publish template" },
      { status: 500 },
    );
  }
}
