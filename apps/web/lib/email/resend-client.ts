import { Resend } from "resend";
import { env } from "@/env";
import { type EmailLogMeta, recordEmailLog } from "./email-log";

/**
 * Check if we're in E2E test mode (skip actual email sending)
 */
function isE2ETestMode(): boolean {
  return env.E2E_TEST_MODE === "true";
}

/**
 * Mock email response for E2E tests
 */
const MOCK_EMAIL_RESPONSE = {
  data: { id: "mock-email-id-e2e-test" },
  error: null,
};

/**
 * Get the Resend client instance
 * Returns null if no API key is configured
 */
export function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(env.RESEND_API_KEY);
}

type EmailAttachment = {
  filename: string;
  content: string;
};

// Email parameters type for HTML emails
type HtmlEmailParams = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

type EmailParams = HtmlEmailParams & {
  /**
   * When provided, the send is recorded in the communication log
   * (`email_logs`). Best-effort — logging never blocks or fails the send.
   */
  log?: EmailLogMeta;
};

type SendResult = { data: { id: string } | null; error: Error | null };

async function deliver(params: HtmlEmailParams): Promise<SendResult> {
  // In E2E test mode, skip actual email sending
  if (isE2ETestMode()) {
    const to = Array.isArray(params.to) ? params.to.join(", ") : params.to;
    console.log(`[E2E Test Mode] Skipping email send to: ${to}`);
    return MOCK_EMAIL_RESPONSE;
  }

  const resend = getResendClient();
  if (!resend) {
    return {
      data: null,
      error: new Error("Resend API key not configured"),
    };
  }

  // Type assertion needed because Resend SDK typing is complex
  return resend.emails.send(params as Parameters<typeof resend.emails.send>[0]);
}

/**
 * Send an email using Resend, with E2E test mode support.
 * In E2E test mode, emails are not actually sent. When `log` metadata is
 * supplied, the attempt is appended to the communication log.
 */
export async function sendEmail(params: EmailParams): Promise<SendResult> {
  const { log, ...emailParams } = params;
  const result = await deliver(emailParams);
  if (log) {
    await recordEmailLog(log, emailParams, result);
  }
  return result;
}
