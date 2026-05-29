import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getActivities } from "./actions";
import { ThingsToDoManager } from "./things-to-do-manager";

export const dynamic = "force-dynamic";

async function ThingsToDoContent() {
  const items = await getActivities();
  return <ThingsToDoManager initialItems={items} />;
}

function ThingsToDoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {["s1", "s2", "s3"].map((id) => (
          <div key={id} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default async function AdminThingsToDoPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-2 py-4 sm:px-4 md:px-8 md:py-8 border border-border">
          <Suspense fallback={<ThingsToDoSkeleton />}>
            <ThingsToDoContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
