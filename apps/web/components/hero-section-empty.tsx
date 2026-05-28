interface HeroSectionEmptyProps {
  title?: string;
  /**
   * Optional couple-names display (e.g. "Harper & James"). When provided,
   * renders in the heading font without the uppercase / wide-tracking
   * treatment used for `title`. Matches the variant logic in HeroSection
   * so the empty-state hero looks like the with-photos one minus the
   * carousel.
   */
  coupleNamesDisplay?: string;
}

/**
 * Empty-state variant of HeroSection — rendered when the wedding has no
 * photos yet. Pure RSC: no carousel, no state, no client JS. Kept as a
 * sibling component (instead of an early return inside HeroSection) so
 * Embla and the carousel hooks don't ship to the client for brand-new
 * weddings that haven't uploaded photos.
 */
export function HeroSectionEmpty({
  title,
  coupleNamesDisplay,
}: HeroSectionEmptyProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
        <div className="relative h-[calc(100dvh-8rem)] bg-gradient-to-br from-accent/20 via-accent/5 to-background flex items-center justify-center">
          {coupleNamesDisplay ? (
            <h1 className="text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] font-display text-foreground drop-shadow-lg text-center px-4 leading-tight">
              {coupleNamesDisplay}
            </h1>
          ) : (
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-foreground uppercase opacity-70 drop-shadow-lg tracking-widest text-center px-4">
              {title}
            </h1>
          )}
        </div>
      </div>
    </section>
  );
}
