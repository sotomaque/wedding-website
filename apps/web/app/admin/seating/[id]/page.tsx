import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import type {
  GuestFilter,
  GuestListFilter,
  GuestRsvpFilter,
} from "@/lib/types/seating";
import { ChartEditor } from "./chart-editor";

export const dynamic = "force-dynamic";

function parseGuestFilter(searchParams: {
  list?: string;
  rsvp?: string;
}): GuestFilter {
  const validListValues: GuestListFilter[] = ["a", "b", "c", "ab", "abc"];
  const validRsvpValues: GuestRsvpFilter[] = ["confirmed", "all"];

  const list = validListValues.includes(searchParams.list as GuestListFilter)
    ? (searchParams.list as GuestListFilter)
    : "abc";
  const rsvp = validRsvpValues.includes(searchParams.rsvp as GuestRsvpFilter)
    ? (searchParams.rsvp as GuestRsvpFilter)
    : "confirmed";

  return { list, rsvp };
}

async function getChartWithDetails(id: string, filter: GuestFilter) {
  // Fetch the chart
  const chart = await db.seatingChart.findUnique({
    where: { id },
  });

  if (!chart) {
    return null;
  }

  // Fetch tables for this chart
  const tables = await db.seatingTable.findMany({
    where: { seatingChartId: id },
    orderBy: { tableNumber: "asc" },
  });

  // Fetch all assignments for these tables
  const tableIds = tables.map((t) => t.id);
  const assignments =
    tableIds.length > 0
      ? await db.guestTableAssignment.findMany({
          where: { seatingTableId: { in: tableIds } },
        })
      : [];

  // Fetch guest details for all assigned guests
  const assignedGuestIds = assignments.map((a) => a.guestId);
  const assignedGuests =
    assignedGuestIds.length > 0
      ? await db.guest.findMany({
          where: { id: { in: assignedGuestIds } },
        })
      : [];

  // Build where clause for filtered guests based on filter options
  const guestWhere: Record<string, unknown> = {};

  // Apply RSVP filter
  if (filter.rsvp === "confirmed") {
    guestWhere.rsvpStatus = "yes";
  }

  // Apply list filter
  if (filter.list === "a") {
    guestWhere.list = "a";
  } else if (filter.list === "b") {
    guestWhere.list = "b";
  } else if (filter.list === "c") {
    guestWhere.list = "c";
  } else if (filter.list === "ab") {
    guestWhere.list = { in: ["a", "b"] };
  }
  // "abc" means all lists, no filter needed

  const filteredGuests = await db.guest.findMany({
    where: guestWhere,
    orderBy: { firstName: "asc" },
  });

  // Build tables with guests
  const tablesWithGuests = tables.map((table) => {
    const tableAssignments = assignments.filter(
      (a) => a.seatingTableId === table.id,
    );
    const tableGuests = tableAssignments
      .map((a) => assignedGuests.find((g) => g.id === a.guestId))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);

    return {
      ...table,
      guests: tableGuests,
      assignedCount: tableGuests.length,
      capacity: table.capacityOverride || chart.defaultSeatsPerTable,
    };
  });

  // Find unassigned guests (from filtered pool)
  const unassignedGuests = filteredGuests.filter(
    (g) => !assignedGuestIds.includes(g.id),
  );

  // Calculate totals
  const totalCapacity = tablesWithGuests.reduce(
    (sum, t) => sum + t.capacity,
    0,
  );
  const totalAssigned = assignedGuestIds.length;

  return {
    ...chart,
    tables: tablesWithGuests,
    totalAssigned,
    totalCapacity,
    unassignedGuests,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ list?: string; rsvp?: string }>;
}

export default async function ChartEditorPage({
  params,
  searchParams,
}: PageProps) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filter = parseGuestFilter(resolvedSearchParams);
  const chart = await getChartWithDetails(id, filter);

  if (!chart) {
    notFound();
  }

  return <ChartEditor chart={chart} filter={filter} />;
}
