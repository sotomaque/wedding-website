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

  // The subject is plain text, so values pass through literally. The HTML body
  // is escaped so guest-supplied values (names, dietary notes, registry
  // claimant info, hotel notes) can't inject markup/script into the email.
  const subject = replaceVariables(template.subject, variables, false);
  const html = replaceVariables(template.htmlBody, variables, true);

  return { subject, html };
}

/**
 * Variable keys whose values are intentionally pre-built, trusted HTML
 * (assembled server-side, e.g. the admin-summary table rows). These are NOT
 * escaped; everything else in the HTML body is.
 */
const RAW_HTML_KEYS = new Set<string>(["UNINVITED_GUESTS"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replace {{{KEY}}} placeholders with values from the variables map.
 * Unmatched placeholders are left as-is (graceful degradation). When
 * `escape` is true, values are HTML-escaped unless the key is a trusted
 * raw-HTML key.
 */
function replaceVariables(
  text: string,
  variables: Record<string, string>,
  escapeValues: boolean,
): string {
  return text.replace(/\{\{\{(\w+)\}\}\}/g, (match, key: string) => {
    if (key in variables) {
      const value = variables[key] ?? match;
      if (!escapeValues || RAW_HTML_KEYS.has(key)) return value;
      return escapeHtml(value);
    }
    return match;
  });
}
