"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { type Locale, locales } from "@/i18n/config";
import { setLocaleCookie } from "./set-locale-action";

export function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const t = useTranslations("languageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(newLocale: Locale) {
    startTransition(async () => {
      await setLocaleCookie(newLocale);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground/50">|</span>}
          <button
            type="button"
            onClick={() => handleChange(locale)}
            disabled={isPending || locale === currentLocale}
            className={`px-1 py-0.5 rounded transition-colors ${
              locale === currentLocale
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            } ${isPending ? "opacity-50 cursor-wait" : ""}`}
          >
            {t(locale)}
          </button>
        </span>
      ))}
    </div>
  );
}
