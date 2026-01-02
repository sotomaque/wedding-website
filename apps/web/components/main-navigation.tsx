"use client";

import { useUser } from "@clerk/nextjs";
import { Navigation } from "@workspace/ui/components/navigation";
import { useMemo } from "react";
import { NAVIGATION_CONFIG } from "@/app/navigation-config";
import { env } from "@/env";

export function MainNavigation() {
  const { user } = useUser();

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
        ? [...NAVIGATION_CONFIG.rightLinks, { href: "/admin", label: "Admin" }]
        : NAVIGATION_CONFIG.rightLinks,
    [isAdmin],
  );

  return (
    <Navigation
      brandImage={NAVIGATION_CONFIG.brandImage}
      leftLinks={NAVIGATION_CONFIG.leftLinks}
      rightLinks={rightLinks}
    />
  );
}
