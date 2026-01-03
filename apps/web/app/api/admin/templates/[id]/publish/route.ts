import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/templates/[id]/publish - Publish a template
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
