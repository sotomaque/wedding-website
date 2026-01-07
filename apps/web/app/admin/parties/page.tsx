import { Suspense } from "react";
import { getParties, getPartiesStats } from "./actions";
import { PartiesTable } from "./parties-table";
import { PartiesTableSkeleton } from "./parties-table-skeleton";
import { PartyStatsCards } from "./party-stats-cards";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    side?: "bride" | "groom" | "both";
    list?: "a" | "b" | "c";
    sortBy?: "invite_code" | "name" | "created_at";
    sortOrder?: "asc" | "desc";
  }>;
}

async function PartiesContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;

  let parties: Awaited<ReturnType<typeof getParties>> = [];
  let stats: Awaited<ReturnType<typeof getPartiesStats>> | null = null;
  let error: string | null = null;

  try {
    [parties, stats] = await Promise.all([
      getParties(params),
      getPartiesStats(),
    ]);
  } catch (e) {
    console.error("Error fetching parties:", e);
    error = "Failed to load parties. Please try again.";
  }

  return (
    <>
      {stats && <PartyStatsCards stats={stats} />}
      <PartiesTable initialParties={parties} error={error} />
    </>
  );
}

export default async function AdminPartiesPage({ searchParams }: PageProps) {
  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-2 py-4 sm:px-4 md:px-8 md:py-8 border border-border">
          <Suspense fallback={<PartiesTableSkeleton />}>
            <PartiesContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
