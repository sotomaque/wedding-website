import { Suspense } from "react";
import { getGuests, getGuestWithPlusOne } from "./actions";
import { EditGuestSheet } from "./edit-guest-sheet";
import { GuestsTable } from "./guests-table";
import { GuestsTableSkeleton } from "./guests-table-skeleton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    side?: "bride" | "groom";
    rsvpStatus?: "pending" | "yes" | "no";
    list?: "a" | "b" | "c";
    family?: "true" | "false";
    isPlusOne?: "true" | "false";
    emailStatus?: "not_sent" | "sent" | "resent";
    sortBy?:
      | "first_name"
      | "email"
      | "side"
      | "list"
      | "rsvp_status"
      | "number_of_resends"
      | "created_at";
    sortOrder?: "asc" | "desc";
    page?: string;
    edit?: string;
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

async function EditGuestContent({ guestId }: { guestId: string }) {
  const { guest, plusOne } = await getGuestWithPlusOne(guestId);

  if (!guest) {
    return null;
  }

  return <EditGuestSheet guest={guest} plusOne={plusOne} />;
}

export default async function AdminGuestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const editGuestId = params.edit;

  return (
    <div className="min-h-screen bg-background px-2 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-card rounded-lg shadow-lg px-2 py-4 sm:px-4 md:px-8 md:py-8 border border-border">
          <Suspense fallback={<GuestsTableSkeleton />}>
            <GuestsContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>

      {editGuestId && (
        <Suspense fallback={null}>
          <EditGuestContent guestId={editGuestId} />
        </Suspense>
      )}
    </div>
  );
}
