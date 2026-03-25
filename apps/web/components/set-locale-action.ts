"use server";

import { cookies } from "next/headers";
import { type Locale, locales } from "@/i18n/config";

export async function setLocaleCookie(locale: Locale) {
  if (!locales.includes(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });
}
