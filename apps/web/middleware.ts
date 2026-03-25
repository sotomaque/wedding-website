import { type NextRequest, NextResponse } from "next/server";
import { defaultLocale, type Locale, locales } from "@/i18n/config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and internal Next.js routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Read locale preference from cookie
  const cookieLocale = request.cookies.get("locale")?.value as
    | Locale
    | undefined;
  const locale =
    cookieLocale && locales.includes(cookieLocale)
      ? cookieLocale
      : defaultLocale;

  // Set locale header for server components to read
  const response = NextResponse.next();
  response.headers.set("x-locale", locale);

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico|.*\\..*).*)"],
};
