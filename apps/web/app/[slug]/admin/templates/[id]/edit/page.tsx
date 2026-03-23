import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { fetchTemplate } from "@/lib/templates/fetch-templates";
import { TemplateEditor } from "../../template-editor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const user = await currentUser();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  const template = await fetchTemplate(id);

  if (!template) {
    notFound();
  }

  return (
    <TemplateEditor mode="edit" templateId={id} initialTemplate={template} />
  );
}
