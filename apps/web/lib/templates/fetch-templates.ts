import type { EmailTemplateType } from "@prisma/client";
import { db } from "@/lib/db";

export interface TemplateVariable {
  key: string;
  description?: string;
  required?: boolean;
}

export interface Template {
  id: string;
  weddingId: string;
  type: EmailTemplateType;
  language: string;
  name: string;
  subject: string;
  htmlBody: string;
  isActive: boolean;
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

function serialize(row: {
  id: string;
  weddingId: string;
  type: EmailTemplateType;
  language: string;
  name: string;
  subject: string;
  htmlBody: string;
  isActive: boolean;
  variables: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Template {
  return {
    id: row.id,
    weddingId: row.weddingId,
    type: row.type,
    language: row.language,
    name: row.name,
    subject: row.subject,
    htmlBody: row.htmlBody,
    isActive: row.isActive,
    variables: (row.variables ?? []) as TemplateVariable[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Fetch all email templates for a wedding (server-side only)
 */
export async function fetchTemplates(weddingId: string): Promise<Template[]> {
  try {
    const rows = await db.emailTemplate.findMany({
      where: { weddingId },
      orderBy: { type: "asc" },
    });

    return rows.map(serialize);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return [];
  }
}

/**
 * Fetch a single template by ID (server-side only)
 */
export async function fetchTemplate(id: string): Promise<Template | null> {
  try {
    const row = await db.emailTemplate.findUnique({
      where: { id },
    });

    if (!row) return null;
    return serialize(row);
  } catch (error) {
    console.error("Error fetching template:", error);
    return null;
  }
}
