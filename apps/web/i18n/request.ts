import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale, locales } from "./config";

export default getRequestConfig(async () => {
  // 1. Check cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value as Locale | undefined;

  // 2. Check x-wedding-locale header (set by middleware from wedding settings)
  const headerStore = await headers();
  const headerLocale = headerStore.get("x-wedding-locale") as
    | Locale
    | undefined;

  // 3. Resolve: cookie > header > default
  let locale: Locale = defaultLocale;
  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale;
  } else if (headerLocale && locales.includes(headerLocale)) {
    locale = headerLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
