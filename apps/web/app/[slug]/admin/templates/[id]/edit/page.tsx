import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { getWeddingBySlug } from "@/lib/db/wedding-context";
import { fetchTemplate } from "@/lib/templates/fetch-templates";
import { TemplateEditor } from "../../template-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { slug, id } = await params;

  const wedding = await getWeddingBySlug(slug);
  if (!wedding) notFound();

  // Authorize against this wedding and scope the lookup to it, so a template
  // can't be read across tenants by guessing its id.
  const auth = await isAdmin(wedding.weddingId);
  if (!auth.authorized) {
    redirect(`/${slug}/admin`);
  }

  const template = await fetchTemplate(id, wedding.weddingId);

  if (!template) {
    notFound();
  }

  return <TemplateEditor template={template} />;
}
