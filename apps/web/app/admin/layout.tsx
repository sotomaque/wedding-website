import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  // Check if user is authenticated
  if (!user) {
    redirect("/sign-in");
  }

  // Get admin emails from environment variable
  const adminEmailsStr = env.ADMIN_EMAILS || "";
  const adminEmails = adminEmailsStr
    .split(",")
    .map((email) => email.trim().toLowerCase());

  // Check if user's email is in the admin list
  const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
  const isAdmin = userEmail && adminEmails.includes(userEmail);

  if (!isAdmin) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
