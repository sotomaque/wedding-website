import { currentUser } from "@clerk/nextjs/server";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getServiceLinks } from "./actions";
import { VendorsManager } from "./vendors-manager";

export const dynamic = "force-dynamic";

function VendorsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

async function VendorsContent() {
  const links = await getServiceLinks();
  return <VendorsManager initialLinks={links} />;
}

export default async function AdminVendorsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<VendorsSkeleton />}>
          <VendorsContent />
        </Suspense>
      </div>
    </div>
  );
}
