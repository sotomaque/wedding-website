import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Wedding-aware middleware.
 *
 * 1. Extracts the wedding slug from URL paths like /[slug]/...
 * 2. Sets x-wedding-slug header for downstream resolution (getWeddingContext)
 * 3. Redirects legacy flat paths (/admin/..., /rsvp, etc.) to /[default-slug]/...
 * 4. Composes with Clerk for auth protection on admin routes
 */

const DEFAULT_WEDDING_SLUG =
  process.env.DEFAULT_WEDDING_SLUG || "helen-and-enrique";

/** Paths that should NOT be treated as wedding slugs */
const RESERVED_PATHS = new Set([
  "api",
  "sign-in",
  "sign-up",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "dashboard",
  "onboarding",
  "platform-admin",
]);

/** Legacy flat paths that should redirect to /[slug]/... */
const LEGACY_PATHS = new Set([
  "admin",
  "rsvp",
  "hotels",
  "things-to-do",
  "events",
  "photos",
  "registry",
  "trip-planner",
  "vendors",
  "slideshow",
  "unauthorized",
]);

const isProtectedRoute = createRouteMatcher([
  "/(.*)/admin(.*)",
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/platform-admin(.*)",
]);

function getSlugFromPath(pathname: string): string | null {
  // pathname is like /helen-and-enrique/admin/guests or /helen-and-enrique/rsvp
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  if (!firstSegment) return null;

  // Don't treat reserved paths as slugs
  if (RESERVED_PATHS.has(firstSegment)) return null;

  // Don't treat static file extensions as slugs
  if (firstSegment.includes(".")) return null;

  return firstSegment;
}

/**
 * For /api/* requests the URL has no slug segment, so the wedding has to be
 * inferred from the page that initiated the call. The Referer header gives us
 * that page's URL — extract the slug from its pathname.
 */
function getSlugFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return getSlugFromPath(new URL(referer).pathname);
  } catch {
    return null;
  }
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  // --- Custom domain redirect ---
  // If accessed via a legacy custom domain (e.g. helen-and-enrique.com),
  // redirect to the main app domain with the wedding slug prepended.
  const CUSTOM_DOMAIN_REDIRECTS: Record<string, string> = {
    "helen-and-enrique.com": "helen-and-enrique",
    "www.helen-and-enrique.com": "helen-and-enrique",
  };

  const slugForDomain = CUSTOM_DOMAIN_REDIRECTS[host];
  if (slugForDomain) {
    const mainDomain =
      process.env.NEXT_PUBLIC_APP_URL || "https://theceremony.app";
    const newUrl = new URL(`/${slugForDomain}${pathname}`, mainDomain);
    newUrl.search = req.nextUrl.search;
    return NextResponse.redirect(newUrl, 308);
  }

  // --- Legacy path redirect ---
  // If the first path segment is a known legacy path (e.g., /admin/guests),
  // redirect to /[default-slug]/admin/guests
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  if (firstSegment && LEGACY_PATHS.has(firstSegment)) {
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = `/${DEFAULT_WEDDING_SLUG}${pathname}`;
    return NextResponse.redirect(newUrl);
  }

  // --- Slug extraction ---
  // For /api/* the path has no slug, so fall back to the Referer (the page
  // that initiated the request).
  const slug =
    getSlugFromPath(pathname) ??
    (pathname.startsWith("/api/")
      ? getSlugFromReferer(req.headers.get("referer"))
      : null);

  // --- Clerk auth for admin routes ---
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // --- Set wedding slug header for downstream resolution ---
  if (slug) {
    const response = NextResponse.next({
      request: {
        headers: new Headers(req.headers),
      },
    });
    response.headers.set("x-wedding-slug", slug);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes (except webhooks)
    "/(api(?!/webhooks)|trpc)(.*)",
  ],
};
