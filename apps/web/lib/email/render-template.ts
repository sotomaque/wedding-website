import type { EmailTemplateType } from "@prisma/client";
import { db } from "@/lib/db";

interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Load a wedding's email template by type, check isActive, and render variables.
 * Returns null if template is inactive (email should not be sent).
 */
export async function renderEmailTemplate(
  weddingId: string,
  type: EmailTemplateType,
  variables: Record<string, string>,
): Promise<RenderedEmail | null> {
  const template = await db.emailTemplate.findUnique({
    where: { weddingId_type: { weddingId, type } },
  });

  if (!template) {
    console.warn(
      `Email template not found: type=${type}, weddingId=${weddingId}`,
    );
    return null;
  }

  if (!template.isActive) {
    return null;
  }

  const subject = replaceVariables(template.subject, variables);
  const html = replaceVariables(template.htmlBody, variables);

  return { subject, html };
}

/**
 * Replace {{{KEY}}} placeholders with values from the variables map.
 * Unmatched placeholders are left as-is (graceful degradation).
 */
function replaceVariables(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{\{(\w+)\}\}\}/g, (match, key: string) => {
    if (key in variables) {
      return variables[key] ?? match;
    }
    return match;
  });
}
