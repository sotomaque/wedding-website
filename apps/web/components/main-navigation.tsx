"use client";

import { Navigation } from "@workspace/ui/components/navigation";
import { useMemo } from "react";
import { getNavigationConfig } from "@/app/navigation-config";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

interface MainNavigationProps {
  isAdmin?: boolean;
}

export function MainNavigation({ isAdmin = false }: MainNavigationProps) {
  const slug = useWeddingSlug();
  const navConfig = useMemo(() => getNavigationConfig(slug), [slug]);

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
