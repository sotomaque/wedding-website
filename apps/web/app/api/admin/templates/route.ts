import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { createTemplateSchema } from "@/lib/validations/admin-api";

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

    const body = await request.json().catch(() => null);
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "type, name, subject, and htmlBody are required",
        },
        { status: 400 },
      );
    }
    const { type, name, subject, htmlBody, isActive, variables } = parsed.data;

    const template = await db.emailTemplate.create({
      data: {
        weddingId,
        // `type` is validated as a non-empty string; cast to the Prisma enum
        // (Prisma rejects an unknown value at the DB layer, as before).
        type: type as Prisma.EmailTemplateCreateInput["type"],
        name,
        subject,
        htmlBody,
        isActive: isActive ?? true,
        variables: (variables ?? []) as Prisma.InputJsonValue,
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
