/**
 * Build a full URL for a wedding page, including the slug prefix.
 *
 * Usage:
 *   weddingUrl("helen-and-enrique", "/rsvp")
 *   // => "https://yoursite.com/helen-and-enrique/rsvp"
 */
export function weddingUrl(slug: string, path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/${slug}${path}`;
}
