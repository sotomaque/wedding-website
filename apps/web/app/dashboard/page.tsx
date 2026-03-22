import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();

  const superAdmins =
    env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  const isSuperAdmin = !!userEmail && superAdmins.includes(userEmail);

  // Find all weddings this user is admin of
  const adminEntries = await db.weddingAdmin.findMany({
    where: {
      OR: [
        { clerkUserId: user.id },
        ...(userEmail ? [{ email: userEmail }] : []),
      ],
    },
    include: {
      wedding: {
        select: {
          id: true,
          slug: true,
          coupleName: true,
          weddingDate: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const weddings = adminEntries.map((entry) => ({
    ...entry.wedding,
    role: entry.role,
  }));

  // If no weddings, redirect to onboarding
  if (weddings.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-serif">My Weddings</h1>
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/platform-admin"
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Platform Admin
              </Link>
            )}
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
            >
              Create New Wedding
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {weddings.map((wedding) => (
            <Link
              key={wedding.id}
              href={`/${wedding.slug}/admin`}
              className="block p-6 bg-card rounded-lg border border-border hover:border-accent/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif">{wedding.coupleName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {wedding.weddingDate
                      ? new Date(wedding.weddingDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "Date not set"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground capitalize">
                    {wedding.role}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      wedding.status === "published"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : wedding.status === "draft"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    } capitalize`}
                  >
                    {wedding.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                /{wedding.slug}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
