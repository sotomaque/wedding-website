import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { getVerifiedPrimaryEmail } from "@/lib/auth/clerk-user";
import { PlatformAdminNav } from "./platform-admin-nav";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Verified primary email only (auth bypass: emailAddresses[0] may be unverified).
  const userEmail = getVerifiedPrimaryEmail(user);
  const superAdmins =
    env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];

  if (!userEmail || !superAdmins.includes(userEmail)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <PlatformAdminNav />
      {children}
    </div>
  );
}
