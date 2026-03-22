import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SeatingClient } from "./seating-client";

export const dynamic = "force-dynamic";

async function getSeatingCharts() {
  return db.seatingChart.findMany({
    orderBy: { updatedAt: "desc" },
  });
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
