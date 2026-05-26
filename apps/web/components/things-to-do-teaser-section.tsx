import { MapPin } from "lucide-react";

interface TeaserActivity {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  imageUrl: string | null;
}

interface ThingsToDoTeaserSectionProps {
  activities: TeaserActivity[];
}

/**
 * Things to Do section, Lovebird-style. Flat vertical list of activities —
 * no card wrapper, no grid — matching the Travel + Registry pattern. Each
 * activity is an emoji + name (serif heading) + description prose.
 *
 * Matches Lovebird's "consistent inline list" approach across all
 * recommendation-type sections: guests see everything at a glance, no
 * card-on-card visual clutter against the dark forest-green background.
 */
export function ThingsToDoTeaserSection({
  activities,
}: ThingsToDoTeaserSectionProps) {
  return (
    <section
      id="things-to-do"
      className="py-24 px-6 bg-background scroll-mt-24"
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Things to Do
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="divide-y divide-foreground/15">
          {activities.map((activity) => (
            <article key={activity.id} className="py-8 first:pt-0 last:pb-0">
              <h3 className="font-serif font-semibold text-foreground text-2xl md:text-3xl mb-3 flex items-center gap-3">
                {activity.emoji ? (
                  // Activity.emoji is a per-row user-customizable field, so
                  // we honor it when set. Falls back to a clean Lucide map
                  // pin when the row has no emoji — keeps the visual rhythm
                  // even for activities the organizer hasn't decorated.
                  <span aria-hidden="true" className="text-2xl shrink-0">
                    {activity.emoji}
                  </span>
                ) : (
                  <MapPin
                    aria-hidden="true"
                    className="size-5 opacity-70 shrink-0"
                    strokeWidth={1.5}
                  />
                )}
                {activity.name}
              </h3>
              {activity.description && (
                <p className="text-foreground/85 text-lg leading-relaxed">
                  {activity.description}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
