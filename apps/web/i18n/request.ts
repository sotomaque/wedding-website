import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale, locales } from "./config";

export default getRequestConfig(async () => {
  // 1. Check cookie (guest override — highest priority)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value as Locale | undefined;

  if (cookieLocale && locales.includes(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Check x-wedding-locale header (set by middleware from cookie)
  const headerStore = await headers();
  const headerLocale = headerStore.get("x-wedding-locale") as
    | Locale
    | undefined;

  if (headerLocale && locales.includes(headerLocale)) {
    return {
      locale: headerLocale,
      messages: (await import(`../messages/${headerLocale}.json`)).default,
    };
  }

  // 3. Try to read the wedding's default language from DB
  // This runs server-side so we can safely import DB utilities
  try {
    const { getWeddingContext } = await import("@/lib/db/wedding-context");
    const ctx = await getWeddingContext();
    // Access the wedding's defaultLanguage from the DB
    const { db } = await import("@/lib/db");
    const wedding = await db.wedding.findUnique({
      where: { id: ctx.weddingId },
      select: { defaultLanguage: true },
    });

    const weddingLocale = wedding?.defaultLanguage as Locale | undefined;
    if (weddingLocale && locales.includes(weddingLocale)) {
      return {
        locale: weddingLocale,
        messages: (await import(`../messages/${weddingLocale}.json`)).default,
      };
    }
  } catch {
    // Not in a wedding context (e.g. landing page, dashboard) — fall through
  }

  // 4. Default fallback
  return {
    locale: defaultLocale,
    messages: (await import(`../messages/${defaultLocale}.json`)).default,
  };
});
