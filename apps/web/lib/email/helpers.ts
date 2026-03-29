import type { WeddingSettings } from "@/lib/db/wedding-content-data";

/**
 * Build a formatted "From" address for emails sent on behalf of a wedding.
 * Falls back to a generic platform address if no per-wedding config exists.
 */
export function getEmailFromAddress(
  settings: Pick<
    WeddingSettings,
    "emailFromName" | "emailFromAddress" | "coupleName"
  >,
  label?: string,
): string {
  const name = label ?? settings.emailFromName ?? settings.coupleName;
  const address = settings.emailFromAddress ?? "noreply@theceremony.app";
  return `${name} <${address}>`;
}

/**
 * Get notification email recipients for a wedding.
 * Falls back to RSVP_EMAIL env var if no per-wedding config exists.
 */
export function getNotificationRecipients(
  settings: Pick<WeddingSettings, "notificationEmails">,
): string[] {
  if (settings.notificationEmails) {
    return settings.notificationEmails.split(",").map((e) => e.trim());
  }
  // Fallback to env var
  const envEmails = process.env.RSVP_EMAIL;
  if (envEmails) {
    return envEmails.split(",").map((e) => e.trim());
  }
  return [];
}
