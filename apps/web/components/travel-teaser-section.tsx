import { Building2, Globe, MapPin, Phone } from "lucide-react";

interface TeaserHotel {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  distanceToVenue: string | null;
  websiteUrl: string | null;
  phone: string | null;
}

interface TravelTeaserSectionProps {
  hotels: TeaserHotel[];
}

/**
 * Travel section, Elegant-style. Flat vertical list of hotels — no card
 * wrappers — with an uppercase "HOTEL" label, the venue name as a bold
 * serif heading, description prose, then a small icon-led metadata line
 * (address / distance / phone) and an outlined Website button.
 *
 * Matches the source-of-truth layout from the Elegant Elegant template
 * (one block per accommodation, separated by generous whitespace, dividers
 * between blocks). Each block is rendered without a box because the page
 * already provides a dark forest-green background; cards on cards would
 * fight the airy feel.
 */
export function TravelTeaserSection({ hotels }: TravelTeaserSectionProps) {
  return (
    <section id="travel" className="py-24 px-6 bg-background scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-display text-center mb-4 text-foreground">
          Travel
        </h2>
        <div className="w-24 h-1 bg-accent mx-auto mb-16" />

        <div className="divide-y divide-foreground/15">
          {hotels.map((hotel) => (
            <article key={hotel.id} className="py-10 first:pt-0 last:pb-0">
              <p className="flex items-center gap-2 text-base md:text-lg uppercase tracking-[0.3em] text-foreground mb-3">
                <Building2
                  aria-hidden="true"
                  className="size-4 opacity-80"
                  strokeWidth={1.5}
                />
                Hotel
              </p>

              <h3 className="font-serif font-semibold text-foreground text-2xl md:text-3xl mb-3">
                {hotel.name}
              </h3>

              {hotel.description && (
                <p className="text-foreground/85 text-lg leading-relaxed mb-5">
                  {hotel.description}
                </p>
              )}

              <div className="space-y-1.5 mb-6">
                {hotel.distanceToVenue && (
                  <p className="flex items-center gap-2 text-foreground/80 text-sm md:text-base">
                    <MapPin
                      aria-hidden="true"
                      className="size-4 opacity-70"
                      strokeWidth={1.5}
                    />
                    {hotel.distanceToVenue}
                  </p>
                )}
                {hotel.phone && (
                  <p className="flex items-center gap-2 text-foreground/80 text-sm md:text-base">
                    <Phone
                      aria-hidden="true"
                      className="size-4 opacity-70"
                      strokeWidth={1.5}
                    />
                    <a
                      href={`tel:${hotel.phone.replace(/[^+\d]/g, "")}`}
                      className="hover:text-foreground"
                    >
                      {hotel.phone}
                    </a>
                  </p>
                )}
              </div>

              {hotel.websiteUrl && (
                <a
                  href={hotel.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-foreground/60 text-foreground text-sm hover:bg-foreground/10 transition-colors"
                >
                  <Globe
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.5}
                  />
                  Website
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
