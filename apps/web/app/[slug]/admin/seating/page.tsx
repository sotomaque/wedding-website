import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { SeatingClient } from "./seating-client";

export const dynamic = "force-dynamic";

async function getSeatingCharts() {
  const weddingId = await getWeddingId();

  const charts = await db
    .selectFrom("seating_charts")
    .where("wedding_id", "=", weddingId)
    .selectAll()
    .orderBy("updated_at", "desc")
    .execute();

  // Convert dates to strings for client component
  return charts.map((chart) => ({
    ...chart,
    created_at:
      chart.created_at instanceof Date
        ? chart.created_at.toISOString()
        : String(chart.created_at),
    updated_at:
      chart.updated_at instanceof Date
        ? chart.updated_at.toISOString()
        : String(chart.updated_at),
  }));
}

async function getConfirmedGuestsCount() {
  const weddingId = await getWeddingId();

  const result = await db
    .selectFrom("guests")
    .where("wedding_id", "=", weddingId)
    .select((eb) => eb.fn.count("id").as("count"))
    .where("rsvp_status", "=", "yes")
    .executeTakeFirst();

  return Number(result?.count || 0);
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
