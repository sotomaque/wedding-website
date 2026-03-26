import type { EmailTemplateType } from "@prisma/client";
import { db } from "@/lib/db";

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Load a wedding's email template by type and language, check isActive, and render variables.
 * Falls back to "en" if the requested language is not found.
 * Returns null if template is inactive (email should not be sent).
 */
export async function renderEmailTemplate(
  weddingId: string,
  type: EmailTemplateType,
  variables: Record<string, string>,
  language?: string,
): Promise<RenderedEmail | null> {
  const lang = language ?? "en";

  let template = await db.emailTemplate.findUnique({
    where: { weddingId_type_language: { weddingId, type, language: lang } },
  });

  // Fall back to English if the requested language was not found
  if (!template && lang !== "en") {
    template = await db.emailTemplate.findUnique({
      where: { weddingId_type_language: { weddingId, type, language: "en" } },
    });
  }

  if (!template) {
    console.warn(
      `Email template not found: type=${type}, language=${lang}, weddingId=${weddingId}`,
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
