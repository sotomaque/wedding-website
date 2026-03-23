"use client";

import { Navigation } from "@workspace/ui/components/navigation";
import { useMemo } from "react";
import { getNavigationConfig } from "@/app/navigation-config";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

interface NavConfig {
  brandImage: { src: string; alt: string; width: number; height: number };
  leftLinks: { href: string; label: string }[];
  rightLinks: { href: string; label: string }[];
}

interface MainNavigationProps {
  isAdmin?: boolean;
  navConfig?: NavConfig;
}

export function MainNavigation({
  isAdmin = false,
  navConfig: navConfigProp,
}: MainNavigationProps) {
  const slug = useWeddingSlug();
  const fallbackConfig = useMemo(() => getNavigationConfig(slug), [slug]);
  const navConfig = navConfigProp ?? fallbackConfig;

  // Add admin link to right links if user is admin
  const rightLinks = useMemo(
    () =>
      isAdmin
        ? [...navConfig.rightLinks, { href: `/${slug}/admin`, label: "Admin" }]
        : navConfig.rightLinks,
    [isAdmin, navConfig.rightLinks, slug],
  );

  return (
    <Navigation
      brandImage={navConfig.brandImage}
      leftLinks={navConfig.leftLinks}
      rightLinks={rightLinks}
    />
  );
}
