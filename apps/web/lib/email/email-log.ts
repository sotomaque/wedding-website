/**
 * Communication log writer.
 *
 * Records every outbound email into the `email_logs` table so the admin can
 * audit who has been contacted and when. Logging is best-effort: a failure
 * here must never break (or slow down materially) the actual send, so the
 * single entry point swallows its own errors.
 */

import { db } from "@/lib/db";

/** Metadata threaded through `sendEmail` to attribute a send in the log. */
export interface EmailLogMeta {
  weddingId: string;
  /** The guest this email was sent to, when applicable. */
  guestId?: string | null;
  /** EmailTemplateType value where applicable, or "custom" for ad-hoc sends. */
  type: string;
}

interface SendResult {
  data: { id: string } | null;
  error: Error | null;
}

interface LoggedParams {
  to: string | string[];
  subject: string;
}

export interface EmailLogData {
  weddingId: string;
  guestId: string | null;
  recipientEmail: string;
  type: string;
  subject: string;
  status: "sent" | "failed";
  providerMessageId: string | null;
  errorMessage: string | null;
}

/**
 * Pure mapper from a send attempt to a log row. Picks the first recipient when
 * `to` is an array, derives status from the presence of an error, and pulls the
 * provider message id / error message off the result.
 */
export function buildEmailLogData(
  meta: EmailLogMeta,
  params: LoggedParams,
  result: SendResult,
): EmailLogData {
  const recipientEmail = Array.isArray(params.to)
    ? (params.to[0] ?? "")
    : params.to;
  return {
    weddingId: meta.weddingId,
    guestId: meta.guestId ?? null,
    recipientEmail,
    type: meta.type,
    subject: params.subject,
    status: result.error ? "failed" : "sent",
    providerMessageId: result.data?.id ?? null,
    errorMessage: result.error?.message ?? null,
  };
}

/**
 * Insert one row describing an attempted send. Best-effort — never throws.
 */
export async function recordEmailLog(
  meta: EmailLogMeta,
  params: LoggedParams,
  result: SendResult,
): Promise<void> {
  try {
    await db.emailLog.create({ data: buildEmailLogData(meta, params, result) });
  } catch (error) {
    console.error("Failed to record email log:", error);
  }
}
