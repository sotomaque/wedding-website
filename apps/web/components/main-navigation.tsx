"use client";

import { useUser } from "@clerk/nextjs";
import { Navigation } from "@workspace/ui/components/navigation";
import { useMemo } from "react";
import { getNavigationConfig } from "@/app/navigation-config";
import { env } from "@/env";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

export function MainNavigation() {
  const { user } = useUser();
  const slug = useWeddingSlug();
  const navConfig = useMemo(() => getNavigationConfig(slug), [slug]);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user) return false;

    const adminEmailsStr = env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    const adminEmails = adminEmailsStr
      .split(",")
      .map((email) => email.trim().toLowerCase());
    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    return Boolean(userEmail && adminEmails.includes(userEmail));
  }, [user]);

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
