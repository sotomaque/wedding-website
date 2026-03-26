import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get a single email template by ID
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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;

    const template = await db.emailTemplate.findUnique({
      where: { id },
    });

    if (!template || template.weddingId !== weddingId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error getting template:", error);
    return NextResponse.json(
      { error: "Failed to get template" },
      { status: 500 },
    );
  }
}

/**
 * Update an email template (subject, htmlBody, isActive)
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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;
    const body = await request.json();
    const { subject, htmlBody, isActive } = body;

    // Verify the template belongs to this wedding
    const existing = await db.emailTemplate.findUnique({ where: { id } });
    if (!existing || existing.weddingId !== weddingId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const updateData: {
      subject?: string;
      htmlBody?: string;
      isActive?: boolean;
    } = {};

    if (subject !== undefined) updateData.subject = subject;
    if (htmlBody !== undefined) updateData.htmlBody = htmlBody;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const template = await db.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 },
    );
  }
}

/**
 * Delete an email template
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
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const { id } = await params;

    // Verify the template belongs to this wedding
    const existing = await db.emailTemplate.findUnique({ where: { id } });
    if (!existing || existing.weddingId !== weddingId) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    await db.emailTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
