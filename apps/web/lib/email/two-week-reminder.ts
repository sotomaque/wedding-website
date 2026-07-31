/**
 * Composer for the "two weeks to go" reminder email sent to confirmed guests.
 *
 * Kept pure (no DB / no Resend) so it is easy to unit-test and so the route can
 * render the same content for the admin preview and the real send. All caller-
 * supplied values (couple name, event names/addresses, guest name) are HTML-
 * escaped before interpolation — this content includes admin- and guest-derived
 * strings and must not allow markup injection into the email.
 */

export interface TwoWeekReminderEvent {
  name: string;
  /** Pre-formatted date label, e.g. "Saturday, July 4, 2026" (may be ""). */
  dateLabel: string;
  /** Pre-formatted time label, e.g. "4:00 PM - 6:00 PM" (may be ""). */
  timeLabel: string;
  locationName: string | null;
  locationAddress: string | null;
}

export interface TwoWeekReminderData {
  coupleName: string;
  /** Pre-formatted headline wedding date, e.g. "Saturday, July 4, 2026". */
  weddingDateLabel: string;
  /** Guest first name for the greeting; omit/null for a generic preview. */
  greetingName?: string | null;
  events: TwoWeekReminderEvent[];
  /** Public wedding-site home URL. */
  websiteUrl: string;
  /** Public registry page URL. */
  registryUrl: string;
  /** Optional external wishlist (e.g. Amazon) shown alongside the registry. */
  externalRegistryUrl?: string | null;
}

export interface RenderedReminderEmail {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Google Maps search link for an address (href is URL-encoded, safe). */
function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`;
}

function renderEvent(event: TwoWeekReminderEvent): string {
  const parts: string[] = [
    `<p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#1a1a1a;">${escapeHtml(
      event.name,
    )}</p>`,
  ];

  const when = [event.dateLabel, event.timeLabel].filter(Boolean).join(" · ");
  if (when) {
    parts.push(
      `<p style="margin:0 0 4px;font-size:14px;color:#555;">${escapeHtml(
        when,
      )}</p>`,
    );
  }

  if (event.locationName || event.locationAddress) {
    const label = event.locationName || event.locationAddress || "";
    const addressLine = event.locationAddress
      ? `<a href="${mapsLink(event.locationAddress)}" style="color:#8b6f47;text-decoration:underline;">${escapeHtml(
          label,
        )}</a>`
      : escapeHtml(label);
    parts.push(
      `<p style="margin:0;font-size:14px;color:#555;">📍 ${addressLine}</p>`,
    );
  }

  return `<div style="padding:14px 16px;border:1px solid #eee;border-radius:8px;margin-bottom:12px;">${parts.join(
    "",
  )}</div>`;
}

/**
 * Render the two-week reminder email (subject + HTML body).
 */
export function renderTwoWeekReminderEmail(
  data: TwoWeekReminderData,
): RenderedReminderEmail {
  const coupleName = escapeHtml(data.coupleName);
  const greeting = data.greetingName
    ? `Hi ${escapeHtml(data.greetingName)},`
    : "Hi there,";

  const eventsHtml =
    data.events.length > 0
      ? data.events.map(renderEvent).join("")
      : `<p style="margin:0;font-size:14px;color:#555;">Full schedule details are on our website.</p>`;

  const externalRegistryHtml = data.externalRegistryUrl
    ? `<p style="margin:12px 0 0;font-size:14px;color:#555;">You can also browse our external wishlist <a href="${escapeHtml(
        data.externalRegistryUrl,
      )}" style="color:#8b6f47;text-decoration:underline;">here</a>.</p>`
    : "";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="background:#8b6f47;padding:28px 24px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Two weeks to go</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:600;">${coupleName}</h1>
          <p style="margin:6px 0 0;color:#f0e9df;font-size:16px;">${escapeHtml(
            data.weddingDateLabel,
          )}</p>
        </div>

        <div style="padding:24px;">
          <p style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444;">
            We can't wait to celebrate with you! Our wedding is just two weeks away.
            Here's everything you need to know.
          </p>

          <h2 style="margin:0 0 12px;font-size:18px;color:#1a1a1a;">Schedule</h2>
          ${eventsHtml}

          <div style="margin-top:24px;padding:18px;background:#f7f5f2;border-radius:8px;text-align:center;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">Registry</h2>
            <p style="margin:0 0 14px;font-size:14px;color:#555;">
              Your presence is the greatest gift — but if you'd like to give something more, we've put together a registry.
            </p>
            <a href="${escapeHtml(
              data.registryUrl,
            )}" style="display:inline-block;padding:12px 28px;background:#8b6f47;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;">View our registry</a>
            ${externalRegistryHtml}
          </div>

          <div style="margin-top:28px;text-align:center;">
            <a href="${escapeHtml(
              data.websiteUrl,
            )}" style="display:inline-block;padding:12px 28px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;">See all the details</a>
          </div>

          <p style="margin:28px 0 0;font-size:14px;color:#777;text-align:center;">
            With love,<br />${coupleName}
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return {
    // Collapse newlines so a CR/LF in coupleName can't split the subject header.
    subject: `Two weeks to go — ${data.coupleName}'s wedding!`.replace(
      /\s*[\r\n]+\s*/g,
      " ",
    ),
    html,
  };
}
