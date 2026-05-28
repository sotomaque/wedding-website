"use client";

import {
  type NavItem,
  Navigation,
  type NavVariant,
} from "@workspace/ui/components/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { getNavigationConfig } from "@/app/navigation-config";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

interface NavConfig {
  brandImage: { src: string; alt: string; width: number; height: number };
  leftLinks: NavItem[];
  rightLinks: NavItem[];
}

interface MainNavigationProps {
  isAdmin?: boolean;
  navConfig?: NavConfig;
  variant?: NavVariant;
}

export function MainNavigation({
  isAdmin = false,
  navConfig: navConfigProp,
  variant,
}: MainNavigationProps) {
  const slug = useWeddingSlug();
  const t = useTranslations("nav");
  const fallbackConfig = useMemo(() => getNavigationConfig(slug), [slug]);
  const navConfig = navConfigProp ?? fallbackConfig;

  const rightLinks = useMemo(
    () =>
      isAdmin
        ? [
            ...navConfig.rightLinks,
            { href: `/${slug}/admin`, label: t("admin") },
          ]
        : navConfig.rightLinks,
    [isAdmin, navConfig.rightLinks, slug, t],
  );

  return (
    <Navigation
      brandImage={navConfig.brandImage}
      brandHref={`/${slug}`}
      leftLinks={navConfig.leftLinks}
      rightLinks={rightLinks}
      variant={variant}
    />
  );
}
