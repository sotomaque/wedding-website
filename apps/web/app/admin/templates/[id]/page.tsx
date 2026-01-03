import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { fetchTemplate } from "@/lib/templates/fetch-templates";
import { TemplateViewer } from "./template-viewer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplatePage({ params }: PageProps) {
  const user = await currentUser();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  const template = await fetchTemplate(id);

  if (!template) {
    notFound();
  }

  return <TemplateViewer template={template} />;
}
