import { Footer } from "@workspace/ui/components/footer";
import { notFound } from "next/navigation";
import { WeddingNavigation } from "@/components/wedding-navigation";
import { getItineraryEvents } from "@/lib/db/itinerary-data";
import { getWeddingSettings } from "@/lib/db/wedding-content-data";
import {
  dayLabel,
  formatTimeRange,
  groupEventsByDay,
  isFull,
  isRsvpable,
} from "@/lib/itinerary";
import {
  ItineraryEventCard,
  type ItineraryEventView,
} from "./itinerary-event-card";

export const dynamic = "force-dynamic";

export default async function ItineraryPage() {
  const [settings, events] = await Promise.all([
    getWeddingSettings(),
    getItineraryEvents(),
  ]);

  if (!settings.featureToggles.itinerary) notFound();

  const days = groupEventsByDay(events);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <WeddingNavigation />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-6 py-10">
        <div className="text-center mb-10">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">
            Wedding Week
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Itinerary</h1>
          <p className="text-muted-foreground mt-3">
            Everything happening around the big day. Tap an event to see the
            details and let us know if you'll be there — no account needed.
          </p>
        </div>

        {days.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border rounded-xl">
            The itinerary is being finalized — check back soon!
          </div>
        ) : (
          <div className="space-y-10">
            {days.map((day) => (
              <section key={day.key}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2 mb-4">
                  {day.label}
                </h2>
                <div className="space-y-4">
                  {day.events.map((event) => {
                    const view: ItineraryEventView = {
                      id: event.id,
                      name: event.name,
                      description: event.description,
                      timeRange: formatTimeRange(
                        event.startTime,
                        event.endTime,
                      ),
                      throughLabel: event.endDate
                        ? `through ${dayLabel(event.endDate)}`
                        : null,
                      locationName: event.locationName,
                      locationAddress: event.locationAddress,
                      token: event.publicRsvpToken,
                      rsvpable: isRsvpable(event),
                      full: isFull(event),
                    };
                    return (
                      <ItineraryEventCard
                        key={event.id}
                        event={view}
                        coupleName={settings.coupleName}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer
        email={settings.contactEmail ?? undefined}
        coupleName={settings.coupleName}
      />
    </div>
  );
}
