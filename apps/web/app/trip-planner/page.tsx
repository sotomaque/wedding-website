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
    db
      .selectFrom("events")
      .select([
        "id",
        "name",
        "event_date",
        "start_time",
        "end_time",
        "location_name",
      ])
      .orderBy("event_date")
      .execute(),
    db
      .selectFrom("guests")
      .leftJoin("parties", "parties.id", "guests.party_id")
      .select([
        "guests.id",
        "guests.first_name",
        "guests.last_name",
        "guests.side",
        "guests.arrival_date",
        "guests.arrival_transport",
        "guests.departure_date",
        "guests.departure_transport",
        "guests.party_id",
        "parties.name as party_name",
      ])
      .where((eb) =>
        eb.or([
          eb("guests.arrival_date", "is not", null),
          eb("guests.departure_date", "is not", null),
        ]),
      )
      .execute(),
    db
      .selectFrom("guest_activity_interests as gai")
      .innerJoin("guests as g", "g.id", "gai.guest_id")
      .innerJoin("activities as a", "a.id", "gai.activity_id")
      .leftJoin("parties as p", "p.id", "g.party_id")
      .select([
        "gai.activity_id",
        "a.name as activity_name",
        "a.emoji as activity_emoji",
        "g.first_name",
        "g.last_name",
        "g.side",
        "gai.invite_code",
        "p.name as party_name",
        "gai.status",
        "gai.planned_date",
      ])
      .where("gai.planned_date", "is not", null)
      .execute(),
  ]);

  const events = eventsRaw.map((e) => ({
    id: e.id,
    name: e.name,
    event_date: toDateStr(e.event_date),
    start_time: e.start_time,
    end_time: e.end_time,
    location_name: e.location_name,
  }));

  // Always group by party for the public view (privacy)
  const parties: PartyTravel[] = groupByParty(
    guestsRaw.map((g) => ({
      id: g.id,
      first_name: g.first_name,
      last_name: g.last_name,
      side: g.side,
      arrival_date: toDateStr(g.arrival_date),
      arrival_transport: g.arrival_transport,
      departure_date: toDateStr(g.departure_date),
      departure_transport: g.departure_transport,
      party_id: g.party_id,
      party_name: g.party_name,
    })),
  );

  const activityPlans: ActivityPlan[] = activityPlansRaw.map((ap) => ({
    activityId: ap.activity_id,
    activityName: ap.activity_name,
    activityEmoji: ap.activity_emoji,
    displayName:
      ap.party_name ?? `${ap.first_name} ${ap.last_name ?? ""}`.trim(),
    dedupeKey: `${ap.invite_code}:${ap.activity_id}`,
    side: ap.side,
    status: ap.status,
    plannedDate: toDateStr(ap.planned_date) ?? "",
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
