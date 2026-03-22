import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SeatingClient } from "./seating-client";

export const dynamic = "force-dynamic";

async function getSeatingCharts() {
  const charts = await db.seatingChart.findMany({
    orderBy: { updatedAt: "desc" },
  });

  // Convert to the shape the client expects (snake_case SeatingChart type from Supabase)
  return charts.map((chart) => ({
    id: chart.id,
    name: chart.name,
    default_seats_per_table: chart.defaultSeatsPerTable,
    is_active: chart.isActive,
    notes: chart.notes,
    created_at:
      chart.createdAt instanceof Date
        ? chart.createdAt.toISOString()
        : String(chart.createdAt),
    updated_at:
      chart.updatedAt instanceof Date
        ? chart.updatedAt.toISOString()
        : String(chart.updatedAt),
    wedding_id: chart.weddingId,
  }));
}

async function getConfirmedGuestsCount() {
  return db.guest.count({
    where: { rsvpStatus: "yes" },
  });
}

export default async function AdminSeatingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [charts, confirmedGuestsCount] = await Promise.all([
    getSeatingCharts(),
    getConfirmedGuestsCount(),
  ]);

  return (
    <SeatingClient
      initialCharts={charts}
      confirmedGuestsCount={confirmedGuestsCount}
    />
  );
}
