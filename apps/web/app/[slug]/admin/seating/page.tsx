import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingId } from "@/lib/db/wedding-context";
import { SeatingClient } from "./seating-client";

export const dynamic = "force-dynamic";

async function getSeatingCharts() {
  const weddingId = await getWeddingId();
  return db.seatingChart.findMany({
    where: { weddingId },
    orderBy: { updatedAt: "desc" },
  });
}

async function getConfirmedGuestsCount() {
  const weddingId = await getWeddingId();
  return db.guest.count({
    where: { rsvpStatus: "yes", weddingId },
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
