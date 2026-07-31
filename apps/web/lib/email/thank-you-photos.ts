/**
 * Composer for the post-wedding thank-you email that asks guests to share the
 * photos they took.
 *
 * Kept pure (no DB / no Resend) so it is easy to unit-test and so the route can
 * render the same content for the admin preview and the real send. All caller-
 * supplied values (couple name, guest name) are HTML-escaped before
 * interpolation so admin/guest-derived strings can't inject markup.
 */

export interface ThankYouPhotosData {
  coupleName: string;
  /** Guest first name for the greeting; omit/null for a generic preview. */
  greetingName?: string | null;
  /** Public no-auth photo upload page, e.g. https://…/{slug}/photos/upload */
  uploadUrl: string;
  /** Public wedding-site home URL. */
  websiteUrl: string;
}

export interface RenderedThankYouEmail {
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

/**
 * Render the thank-you + photo-request email (subject + HTML body).
 */
export function renderThankYouPhotosEmail(
  data: ThankYouPhotosData,
): RenderedThankYouEmail {
  const coupleName = escapeHtml(data.coupleName);
  const greeting = data.greetingName
    ? `Hi ${escapeHtml(data.greetingName)},`
    : "Hi there,";

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="background:#8b6f47;padding:28px 24px;text-align:center;">
          <p style="margin:0;color:#fff;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Thank you</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:600;">${coupleName}</h1>
        </div>

        <div style="padding:24px;">
          <p style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">${greeting}</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#444;">
            Thank you so much for celebrating with us! Having you there made our
            wedding everything we hoped it would be, and your love and support
            mean the world to us.
          </p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#444;">
            One small favor: if you took any photos (or a hundred!), we would
            love to have them. Every candid moment you caught is a memory we
            don't have — please share them all, straight from your phone.
          </p>

          <div style="margin-top:8px;padding:18px;background:#f7f5f2;border-radius:8px;text-align:center;">
            <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a1a;">Share your photos</h2>
            <p style="margin:0 0 14px;font-size:14px;color:#555;">
              No account needed — just tap the button, pick your photos, and
              you're done. Upload as many as you like, as many times as you like.
            </p>
            <a href="${escapeHtml(
              data.uploadUrl,
            )}" style="display:inline-block;padding:12px 28px;background:#8b6f47;color:#fff;text-decoration:none;border-radius:6px;font-size:15px;">Upload your photos</a>
          </div>

          <div style="margin-top:24px;text-align:center;">
            <a href="${escapeHtml(
              data.websiteUrl,
            )}" style="font-size:14px;color:#8b6f47;text-decoration:underline;">Visit our website</a>
          </div>

          <p style="margin:28px 0 0;font-size:14px;color:#777;text-align:center;">
            With all our love,<br />${coupleName}
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return {
    subject: `Thank you for celebrating with us — ${data.coupleName}`,
    html,
  };
}
