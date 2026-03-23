import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { env } from "@/env";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  const superAdmins =
    env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];

  if (!userEmail || !superAdmins.includes(userEmail)) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-lg">Platform Admin</h1>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Dashboard
        </a>
      </nav>
      {children}
    </div>
  );
}
