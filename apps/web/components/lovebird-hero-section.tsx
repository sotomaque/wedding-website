import { FloralCorner } from "@workspace/ui/components/motifs";
import Image from "next/image";
import { CountdownTimer } from "./countdown-timer";
import type { HeroPhoto } from "./hero-section";

interface LovebirdHeroSectionProps {
  photos: HeroPhoto[];
  coupleNamesDisplay: string;
  /** ISO date string (serializable from server component). */
  weddingDateIso: string;
  /** Display copy for the "M | D | YYYY" line. */
  weddingDateFormatted: string;
  /** Uppercase location e.g. "SEATTLE, WASHINGTON". */
  location?: string;
}

/**
 * Lovebird-style hero — single contained photo on top, then a dark "card"
 * with floral corners, couple names in script, M | D | YYYY date, location,
 * and a live countdown. Used by templates whose `heroDisplay` is
 * "couple-names" (currently only Elegant). When the wedding has no photos
 * the photo block is omitted and the card stands alone.
 */
export function LovebirdHeroSection({
  photos,
  coupleNamesDisplay,
  weddingDateIso,
  weddingDateFormatted,
  location,
}: LovebirdHeroSectionProps) {
  const heroPhoto = photos[0];

  return (
    <section className="relative overflow-hidden">
      {heroPhoto && (
        <div className="relative w-full h-[55vh] md:h-[65vh] bg-secondary">
          <Image
            src={heroPhoto.src}
            alt={heroPhoto.alt}
            fill
            // Hero spans the full viewport width at every breakpoint.
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>
      )}

      {/* Hero "card" — sits below the photo on a continuous background. The
          floral corner sprays anchor the composition and echo the section
          dividers below. */}
      <div className="relative bg-background py-16 md:py-24 px-6 overflow-hidden">
        {/* Top-left corner spray */}
        <div className="pointer-events-none absolute top-0 left-0 text-foreground opacity-80">
          <FloralCorner className="w-32 md:w-44 lg:w-56 h-auto" />
        </div>
        {/* Top-right corner spray — mirrored */}
        <div
          className="pointer-events-none absolute top-0 right-0 text-foreground opacity-80"
          style={{ transform: "scaleX(-1)" }}
        >
          <FloralCorner className="w-32 md:w-44 lg:w-56 h-auto" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="font-display text-foreground text-7xl sm:text-8xl md:text-9xl lg:text-[8.5rem] leading-tight drop-shadow-sm">
            {coupleNamesDisplay}
          </h1>

          <p className="mt-8 text-foreground font-serif text-3xl md:text-4xl tracking-wide">
            {weddingDateFormatted}
          </p>

          {location && (
            <p className="mt-3 text-foreground/90 text-sm md:text-base uppercase tracking-[0.3em]">
              {location}
            </p>
          )}

          <div className="mt-8 text-accent">
            <CountdownTimer targetDate={weddingDateIso} />
          </div>
        </div>
      </div>
    </section>
  );
}
