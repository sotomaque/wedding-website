import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";

/**
 * List email templates for the current wedding
 * @response 200:SuccessResponse
 * @auth bearer
 * @tag Admin - Templates
 * @openapi
 */
export async function GET(): Promise<NextResponse> {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const templates = await db.emailTemplate.findMany({
      where: { weddingId },
      orderBy: { type: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 },
    );
  }
}

/**
 * Create a new email template (for flexibility, though templates are seeded)
 * @body CreateTemplateBody
 * @response 201:SuccessResponse
 * @auth bearer
 * @tag Admin - Templates
 * @openapi
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const weddingId = await getWeddingId();
    const auth = await requireAdmin(weddingId);
    if ("status" in auth) return auth;

    const body = await request.json();
    const { type, name, subject, htmlBody, isActive, variables } = body;

    if (!type || !name || !subject || !htmlBody) {
      return NextResponse.json(
        { error: "type, name, subject, and htmlBody are required" },
        { status: 400 },
      );
    }

    const template = await db.emailTemplate.create({
      data: {
        weddingId,
        type,
        name,
        subject,
        htmlBody,
        isActive: isActive ?? true,
        variables: variables ?? [],
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}
