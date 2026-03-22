import { Footer } from "@workspace/ui/components/footer";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  type ActivityPlan,
  groupByParty,
  type PartyTravel,
} from "@/app/[slug]/admin/calendar/utils";
import { GuestIdentifier } from "@/app/[slug]/things-to-do/guest-identifier";
import { MainNavigation } from "@/components/main-navigation";
import { getGuestParty } from "@/lib/auth/guest-session";
import { toDateStr } from "@/lib/calendar/date-utils";
import { db } from "@/lib/db";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import { getWeddingId } from "@/lib/db/wedding-context";
import { TripPlannerClient } from "./trip-planner-client";

export default async function TripPlannerPage() {
  const cookieStore = await cookies();
  const codeFromCookie = cookieStore.get("invite_code")?.value?.toUpperCase();
  const party = await getGuestParty(codeFromCookie);
  const inviteCode = party?.inviteCode || codeFromCookie;

  const [weddingId, settings] = await Promise.all([
    getWeddingId(),
    getWeddingSettings(),
  ]);

  if (!settings.featureToggles.tripPlanner) notFound();

  // Fetch events, guests with travel dates, and activity plans in parallel
  const [eventsRaw, guestsRaw, activityPlansRaw] = await Promise.all([
    db.event.findMany({
      where: { weddingId },
      select: {
        id: true,
        name: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        locationName: true,
      },
      orderBy: { eventDate: "asc" },
    }),
    db.guest.findMany({
      where: {
        weddingId,
        OR: [{ arrivalDate: { not: null } }, { departureDate: { not: null } }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        side: true,
        arrivalDate: true,
        arrivalTransport: true,
        departureDate: true,
        departureTransport: true,
        partyId: true,
        party: {
          select: { name: true },
        },
      },
    }),
    db.guestActivityInterest.findMany({
      where: { plannedDate: { not: null }, weddingId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            side: true,
            party: { select: { name: true } },
          },
        },
        activity: {
          select: { name: true, emoji: true },
        },
      },
    }),
  ]);

  const events = eventsRaw.map((e) => ({
    id: e.id,
    name: e.name,
    eventDate: toDateStr(e.eventDate),
    startTime: e.startTime
      ? e.startTime instanceof Date
        ? e.startTime.toISOString()
        : String(e.startTime)
      : null,
    endTime: e.endTime
      ? e.endTime instanceof Date
        ? e.endTime.toISOString()
        : String(e.endTime)
      : null,
    locationName: e.locationName,
  }));

  // Always group by party for the public view (privacy)
  const parties: PartyTravel[] = groupByParty(
    guestsRaw.map((g) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      side: g.side,
      arrivalDate: toDateStr(g.arrivalDate),
      arrivalTransport: g.arrivalTransport,
      departureDate: toDateStr(g.departureDate),
      departureTransport: g.departureTransport,
      partyId: g.partyId,
      partyName: g.party?.name ?? null,
    })),
  );

  const activityPlans: ActivityPlan[] = activityPlansRaw
    .filter((ap) => ap.status === "interested" || ap.status === "committed")
    .map((ap) => ({
      activityId: ap.activityId,
      activityName: ap.activity.name,
      activityEmoji: ap.activity.emoji,
      displayName:
        ap.guest.party?.name ??
        `${ap.guest.firstName} ${ap.guest.lastName ?? ""}`.trim(),
      dedupeKey: `${ap.inviteCode}:${ap.activityId}`,
      side: ap.guest.side,
      status: ap.status as "interested" | "committed",
      plannedDate: toDateStr(ap.plannedDate) ?? "",
    }));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MainNavigation />

      <main className="grow">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-medium">Trip Planner</h1>
            <p className="text-muted-foreground mt-1">
              See when everyone is arriving and what they're planning to do
            </p>
          </div>

          {!inviteCode && (
            <div className="mb-8">
              <GuestIdentifier />
            </div>
          )}

          <TripPlannerClient
            events={events}
            parties={parties}
            activityPlans={activityPlans}
          />
        </div>
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}
