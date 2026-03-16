import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getResendClient } from "@/lib/email/resend-client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Duplicate email template
 * @description Create a copy of an existing email template in Resend
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
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = env.ADMIN_EMAILS?.split(",").map((e) =>
      e.trim().toLowerCase(),
    );
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    if (!adminEmails?.includes(userEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const { data, error } = await resend.templates.duplicate(id);

    if (error) {
      console.error("Error duplicating template:", error);
      return NextResponse.json(
        { error: error.message || "Failed to duplicate template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error("Error duplicating template:", error);
    return NextResponse.json(
      { error: "Failed to duplicate template" },
      { status: 500 },
    );
  }
}
