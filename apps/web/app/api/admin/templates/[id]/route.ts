import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getResendClient } from "@/lib/email/resend-client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get email template
 * @description Fetch a specific email template by ID from Resend
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Templates
 * @openapi
 */
export async function GET(
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

    const { data, error } = await resend.templates.get(id);

    if (error) {
      console.error("Error getting template:", error);
      return NextResponse.json(
        { error: error.message || "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error("Error getting template:", error);
    return NextResponse.json(
      { error: "Failed to get template" },
      { status: 500 },
    );
  }
}

/**
 * Update email template
 * @description Update an existing email template's name, subject, or HTML content
 * @pathParams IdParams
 * @body UpdateTemplateBody
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Templates
 * @openapi
 */
export async function PATCH(
  request: Request,
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
    const body = await request.json();
    const { name, subject, html } = body;

    const updateOptions: {
      name?: string;
      subject?: string;
      html?: string;
    } = {};

    if (name) updateOptions.name = name;
    if (subject) updateOptions.subject = subject;
    if (html) updateOptions.html = html;

    if (Object.keys(updateOptions).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: "Email not configured" },
        { status: 500 },
      );
    }

    const { data, error } = await resend.templates.update(id, updateOptions);

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
}

/**
 * Delete email template
 * @description Permanently delete an email template from Resend
 * @pathParams IdParams
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Templates
 * @openapi
 */
export async function DELETE(
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

    const { error } = await resend.templates.remove(id);

    if (error) {
      console.error("Error deleting template:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete template" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
