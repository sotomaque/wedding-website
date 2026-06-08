import { Suspense } from "react";
import {
  getEventsForSelect,
  getGuestEventIds,
  getGuests,
  getGuestWithPlusOne,
  getPartiesForSelect,
} from "./actions";
import { EditGuestSheet } from "./edit-guest-sheet";
import { GuestsTable } from "./guests-table";
import { GuestsTableSkeleton } from "./guests-table-skeleton";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    side?: "bride" | "groom";
    rsvpStatus?: string;
    list?: "a" | "b" | "c";
    family?: "true" | "false";
    isPlusOne?: "true" | "false";
    emailStatus?: "not_sent" | "sent" | "resent";
    physicalInviteSent?: "true" | "false";
    selfRegistered?: "true" | "false";
    bridalParty?:
      | "groomsman"
      | "best_man"
      | "bridesmaid"
      | "maid_of_honor"
      | "any";
    sortBy?:
      | "firstName"
      | "email"
      | "side"
      | "list"
      | "rsvpStatus"
      | "numberOfResends"
      | "createdAt";
    sortOrder?: "asc" | "desc";
    events?: string;
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

  let guests: Awaited<ReturnType<typeof getGuests>> = [];
  let error: string | null = null;

  try {
    guests = await getGuests(params);
  } catch (e) {
    console.error("Error fetching guests:", e);
    error = "Failed to load guests. Please try again.";
  }

  const [parties, events] = await Promise.all([
    getPartiesForSelect(),
    getEventsForSelect(),
  ]);

  return (
    <GuestsTable
      initialGuests={guests}
      error={error}
      parties={parties}
      events={events}
    />
  );
}

async function EditGuestContent({ guestId }: { guestId: string }) {
  const [{ guest, plusOne }, parties, events, guestEventIds] =
    await Promise.all([
      getGuestWithPlusOne(guestId),
      getPartiesForSelect(),
      getEventsForSelect(),
      getGuestEventIds(guestId),
    ]);

  if (!guest) {
    return null;
  }

  return (
    <EditGuestSheet
      guest={guest}
      plusOne={plusOne}
      parties={parties}
      events={events}
      guestEventIds={guestEventIds}
    />
  );
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
