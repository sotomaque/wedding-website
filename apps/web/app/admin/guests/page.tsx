import { Suspense } from "react";
import { getGuests } from "./actions";
import { GuestsTable } from "./guests-table";
import { GuestsTableSkeleton } from "./guests-table-skeleton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    side?: "bride" | "groom";
    rsvpStatus?: "pending" | "yes" | "no";
    family?: "true" | "false";
    isPlusOne?: "true" | "false";
    sortBy?:
      | "first_name"
      | "email"
      | "side"
      | "list"
      | "rsvp_status"
      | "created_at";
    sortOrder?: "asc" | "desc";
    page?: string;
  }>;
}

async function GuestsContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  const params = await searchParams;
  const guests = await getGuests(params);

  return <GuestsTable initialGuests={guests} />;
}

export default async function AdminGuestsPage({ searchParams }: PageProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <Suspense fallback={<GuestsTableSkeleton />}>
            <GuestsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
