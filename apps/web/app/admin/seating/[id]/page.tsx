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
  const chart = await db
    .selectFrom("seating_charts")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();

  if (!chart) {
    return null;
  }

  // Fetch tables for this chart
  const tables = await db
    .selectFrom("seating_tables")
    .selectAll()
    .where("seating_chart_id", "=", id)
    .orderBy("table_number", "asc")
    .execute();

  // Fetch all assignments for these tables
  const tableIds = tables.map((t) => t.id);
  const assignments =
    tableIds.length > 0
      ? await db
          .selectFrom("guest_table_assignments")
          .selectAll()
          .where("seating_table_id", "in", tableIds)
          .execute()
      : [];

  // Fetch guest details for all assigned guests
  const assignedGuestIds = assignments.map((a) => a.guest_id);
  const assignedGuests =
    assignedGuestIds.length > 0
      ? await db
          .selectFrom("guests")
          .selectAll()
          .where("id", "in", assignedGuestIds)
          .execute()
      : [];

  // Build query for filtered guests based on filter options
  let guestQuery = db.selectFrom("guests").selectAll();

  // Apply RSVP filter
  if (filter.rsvp === "confirmed") {
    guestQuery = guestQuery.where("rsvp_status", "=", "yes");
  }

  // Apply list filter
  if (filter.list === "a") {
    guestQuery = guestQuery.where("list", "=", "a");
  } else if (filter.list === "b") {
    guestQuery = guestQuery.where("list", "=", "b");
  } else if (filter.list === "c") {
    guestQuery = guestQuery.where("list", "=", "c");
  } else if (filter.list === "ab") {
    guestQuery = guestQuery.where("list", "in", ["a", "b"]);
  }
  // "abc" means all lists, no filter needed

  const filteredGuests = await guestQuery
    .orderBy("first_name", "asc")
    .execute();

  // Build tables with guests
  const tablesWithGuests = tables.map((table) => {
    const tableAssignments = assignments.filter(
      (a) => a.seating_table_id === table.id,
    );
    const tableGuests = tableAssignments
      .map((a) => assignedGuests.find((g) => g.id === a.guest_id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);

    return {
      ...table,
      created_at:
        table.created_at instanceof Date
          ? table.created_at.toISOString()
          : String(table.created_at),
      guests: tableGuests.map((g) => ({
        ...g,
        created_at:
          g.created_at instanceof Date
            ? g.created_at.toISOString()
            : String(g.created_at),
        activities_email_sent_at: g.activities_email_sent_at
          ? g.activities_email_sent_at instanceof Date
            ? g.activities_email_sent_at.toISOString()
            : String(g.activities_email_sent_at)
          : null,
      })),
      assignedCount: tableGuests.length,
      capacity: table.capacity_override || chart.default_seats_per_table,
    };
  });

  // Find unassigned guests (from filtered pool)
  const unassignedGuests = filteredGuests
    .filter((g) => !assignedGuestIds.includes(g.id))
    .map((g) => ({
      ...g,
      created_at:
        g.created_at instanceof Date
          ? g.created_at.toISOString()
          : String(g.created_at),
      activities_email_sent_at: g.activities_email_sent_at
        ? g.activities_email_sent_at instanceof Date
          ? g.activities_email_sent_at.toISOString()
          : String(g.activities_email_sent_at)
        : null,
    }));

  // Calculate totals
  const totalCapacity = tablesWithGuests.reduce(
    (sum, t) => sum + t.capacity,
    0,
  );
  const totalAssigned = assignedGuestIds.length;

  return {
    ...chart,
    created_at:
      chart.created_at instanceof Date
        ? chart.created_at.toISOString()
        : String(chart.created_at),
    updated_at:
      chart.updated_at instanceof Date
        ? chart.updated_at.toISOString()
        : String(chart.updated_at),
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
