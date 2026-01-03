import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TemplateEditor } from "../template-editor";

export default async function NewTemplatePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <TemplateEditor mode="create" />;
}
