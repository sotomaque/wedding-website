import { currentUser } from "@clerk/nextjs/server";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDocuments } from "./actions";
import { DocumentsManager } from "./documents-manager";

export const dynamic = "force-dynamic";

function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

async function DocumentsContent() {
  const documents = await getDocuments();
  return <DocumentsManager initialDocuments={documents} />;
}

export default async function AdminDocumentsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<DocumentsSkeleton />}>
          <DocumentsContent />
        </Suspense>
      </div>
    </div>
  );
}
