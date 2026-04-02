import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingBySlug } from "@/lib/db/wedding-context";
import { AdminNav } from "./admin-nav";
import { LazyChatPanel } from "./lazy-chat-panel";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await getWeddingBySlug(slug);

  if (!wedding) {
    redirect("/");
  }

  const auth = await isAdmin(wedding.weddingId);

  if (!auth.authorized) {
    redirect(`/${slug}/unauthorized`);
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav isSuperAdmin={auth.role === "superadmin"} />
      <main className="max-w-screen-2xl mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-4 md:py-8">
        {children}
      </main>
      <LazyChatPanel />
    </div>
  );
}
