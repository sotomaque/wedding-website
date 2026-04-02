import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingBySlug } from "@/lib/db/wedding-context";

export default async function SuperAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await getWeddingBySlug(slug);
  if (!wedding) redirect("/");

  const auth = await isAdmin(wedding.weddingId);
  if (auth.role !== "superadmin") {
    redirect(`/${slug}/admin`);
  }

  return <>{children}</>;
}
