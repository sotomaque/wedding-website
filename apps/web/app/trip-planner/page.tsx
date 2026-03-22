import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import { cookies } from "next/headers";
import {
  type ActivityPlan,
  groupByParty,
  type PartyTravel,
} from "@/app/admin/calendar/utils";
import { NAVIGATION_CONFIG } from "@/app/navigation-config";
import { SITE_CONFIG } from "@/app/site-config";
import { GuestIdentifier } from "@/app/things-to-do/guest-identifier";
import { getGuestParty } from "@/lib/auth/guest-session";
import { toDateStr } from "@/lib/calendar/date-utils";
import { db } from "@/lib/db";
import { TripPlannerClient } from "./trip-planner-client";

export default async function TripPlannerPage() {
  const cookieStore = await cookies();
  const codeFromCookie = cookieStore.get("invite_code")?.value?.toUpperCase();
  const party = await getGuestParty(codeFromCookie);
  const inviteCode = party?.inviteCode || codeFromCookie;

  // Fetch events, guests with travel dates, and activity plans in parallel
  const [eventsRaw, guestsRaw, activityPlansRaw] = await Promise.all([
    db.event.findMany({
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
      where: { plannedDate: { not: null } },
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
    event_date: toDateStr(e.eventDate),
    start_time: e.startTime
      ? e.startTime instanceof Date
        ? e.startTime.toISOString()
        : String(e.startTime)
      : null,
    end_time: e.endTime
      ? e.endTime instanceof Date
        ? e.endTime.toISOString()
        : String(e.endTime)
      : null,
    location_name: e.locationName,
  }));

  // Always group by party for the public view (privacy)
  const parties: PartyTravel[] = groupByParty(
    guestsRaw.map((g) => ({
      id: g.id,
      first_name: g.firstName,
      last_name: g.lastName,
      side: g.side,
      arrival_date: toDateStr(g.arrivalDate),
      arrival_transport: g.arrivalTransport,
      departure_date: toDateStr(g.departureDate),
      departure_transport: g.departureTransport,
      party_id: g.partyId,
      party_name: g.party?.name ?? null,
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
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
      />

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

      <Footer email={SITE_CONFIG.email} coupleName={SITE_CONFIG.couple.name} />
    </div>
  );
}
