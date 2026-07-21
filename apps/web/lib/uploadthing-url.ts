/**
 * Whether a URL is a trusted UploadThing file URL — the only kind we accept for
 * user-submitted photo URLs and the only kind we will fetch server-side.
 *
 * The guest-photo uploader is public, and the admin "download all" route
 * fetch()es each stored URL server-side, so an unvalidated URL is an SSRF
 * vector (a caller could plant http://169.254.169.254/... or an internal host).
 * Requiring https + an UploadThing host closes it.
 */
export function isAllowedUploadUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  // utfs.io is the legacy host; <appId>.ufs.sh is the current per-app CDN host.
  return host === "utfs.io" || host.endsWith(".ufs.sh");
}
