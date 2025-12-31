"use client";

import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { NAVIGATION_CONFIG } from "@/app/navigation-config";
import { ErrorBoundary } from "@/components/error-boundary";
import { HEADQUARTERS, IMMACULATA, LOCATIONS } from "./constants";
import { SanDiegoMap } from "./san-diego-map";

export default function ThingsToDoPage() {
  const [activeLocation, setActiveLocation] = useState<string | undefined>();
  const [manuallySelected, setManuallySelected] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const handleScroll = () => {
      // Don't update active location on scroll if user manually clicked a location
      if (manuallySelected) {
        return;
      }

      const scrollPosition = window.scrollY + window.innerHeight / 2;

      for (const location of LOCATIONS) {
        const element = sectionRefs.current[location.id];
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          const elementBottom = elementTop + rect.height;

          if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
            if (activeLocation !== location.id) {
              setActiveLocation(location.id);
            }
            return;
          }
        }
      }
      setActiveLocation(undefined);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [manuallySelected, activeLocation]);

  const handleLocationClick = (locationId: string) => {
    setActiveLocation(locationId);
    setManuallySelected(true);

    // Scroll to the location card smoothly
    const element = sectionRefs.current[locationId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Reset manual selection after a delay to allow scroll detection again
    setTimeout(() => {
      setManuallySelected(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation
        brandImage={NAVIGATION_CONFIG.brandImage}
        leftLinks={NAVIGATION_CONFIG.leftLinks}
        rightLinks={NAVIGATION_CONFIG.rightLinks}
      />

      <main className="grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-card">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-foreground mb-6">
                Our Favorite San Diego Spots
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We're so excited to share our favorite corners of San Diego with
                you! Whether you're looking for ocean views, amazing food, or a
                bit of local culture, these are the places we love and think you
                will too.
              </p>
            </div>
          </div>
        </section>

        {/* Split Layout: Locations + Map */}
        <section className="relative bg-secondary">
          <div className="flex flex-col lg:flex-row">
            {/* Left: Scrollable Content */}
            <div className="lg:w-1/2 lg:h-screen lg:overflow-y-auto">
              <div className="py-12 px-6">
                <div className="max-w-2xl mx-auto space-y-12">
                  {/* Wedding Venues Section */}
                  <div className="space-y-6">
                    <h2 className="text-3xl font-serif text-foreground text-center mb-8">
                      Wedding Venues
                    </h2>
                    {[IMMACULATA, HEADQUARTERS].map((venue) => (
                      <div
                        key={venue.id}
                        ref={(el) => {
                          sectionRefs.current[venue.id] = el;
                        }}
                        className="min-h-[400px] flex items-center"
                      >
                        <button
                          type="button"
                          onClick={() => handleLocationClick(venue.id)}
                          onMouseEnter={() => handleLocationClick(venue.id)}
                          className={`w-full bg-card rounded-lg shadow-sm border-2 transition-all duration-300 cursor-pointer hover:shadow-md hover:border-accent text-left overflow-hidden ${
                            activeLocation === venue.id
                              ? "border-accent shadow-lg"
                              : "border-border"
                          }`}
                        >
                          <div className="relative w-full h-64">
                            <Image
                              src={venue.imageUrl}
                              alt={venue.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="p-8">
                            <div className="flex items-center gap-2 mb-4">
                              <h3 className="text-3xl font-serif text-foreground">
                                {venue.name}
                              </h3>
                              <span className="text-xs uppercase tracking-wider bg-accent/10 text-accent px-2 py-1 rounded">
                                {venue.type}
                              </span>
                            </div>
                            <p className="text-muted-foreground mb-4 leading-relaxed">
                              {venue.description}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              📍 {venue.address}
                            </p>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border pt-8">
                    <h2 className="text-3xl font-serif text-foreground text-center mb-8">
                      Things to Do
                    </h2>
                  </div>

                  {/* Things to Do Section */}
                  {LOCATIONS.map((location) => (
                    <div
                      key={location.id}
                      ref={(el) => {
                        sectionRefs.current[location.id] = el;
                      }}
                      className="min-h-[400px] flex items-center"
                    >
                      <button
                        type="button"
                        onClick={() => handleLocationClick(location.id)}
                        onMouseEnter={() => handleLocationClick(location.id)}
                        className={`w-full bg-card rounded-lg shadow-sm border-2 transition-all duration-300 cursor-pointer hover:shadow-md hover:border-accent text-left overflow-hidden ${
                          activeLocation === location.id
                            ? "border-accent shadow-lg"
                            : "border-border"
                        }`}
                      >
                        <div className="relative w-full h-64">
                          <Image
                            src={location.imageUrl}
                            alt={location.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="p-8">
                          <h3 className="text-3xl font-serif text-foreground mb-4">
                            {location.name}
                          </h3>
                          <p className="text-muted-foreground mb-4 leading-relaxed">
                            {location.description}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            📍 {location.address}
                          </p>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Fixed Map */}
            <div className="hidden lg:block lg:w-1/2 lg:h-screen lg:sticky lg:top-0">
              <ErrorBoundary
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center space-y-4 p-8">
                      <p className="text-lg font-semibold text-foreground">
                        Unable to load map
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Please check your internet connection and try refreshing
                        the page.
                      </p>
                    </div>
                  </div>
                }
              >
                <SanDiegoMap
                  activeLocation={activeLocation}
                  onLocationClick={handleLocationClick}
                />
              </ErrorBoundary>
            </div>
          </div>
        </section>

        {/* Food & Drink Section */}
        <section className="relative overflow-hidden bg-card">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-serif text-center mb-12 text-foreground">
                Where We Love to Eat & Drink
              </h2>
              <div className="w-24 h-1 bg-accent mx-auto mb-12 -mt-8" />
              <div className="grid gap-8">
                <div className="bg-background p-8 rounded-lg border border-border">
                  <h3 className="text-2xl font-serif text-foreground mb-4">
                    Our Brewery Picks
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    San Diego's craft beer scene is world-class, and we've tried
                    our fair share! These are our favorites for a casual
                    afternoon or evening out.
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Ballast Point - We love their Sculpin IPA</li>
                    <li>• Stone Brewing - Amazing food and great patio</li>
                    <li>• Modern Times - Perfect for a relaxed vibe</li>
                    <li>• Karl Strauss - A San Diego classic</li>
                  </ul>
                </div>

                <div className="bg-background p-8 rounded-lg border border-border">
                  <h3 className="text-2xl font-serif text-foreground mb-4">
                    Must-Try Restaurants
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    These are the places we find ourselves coming back to again
                    and again. Trust us, you won't be disappointed!
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Puesto - Best tacos in town, hands down</li>
                    <li>• Hodad's - Massive burgers worth the wait</li>
                    <li>• The Fish Market - Fresh catch with harbor views</li>
                    <li>• Oscar's - Our fish taco spot near the beach</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Around Section */}
        <section className="relative overflow-hidden bg-secondary">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-serif text-center mb-8 text-foreground">
                Getting Around the City
              </h2>
              <div className="w-24 h-1 bg-accent mx-auto mb-8 -mt-4" />
              <p className="text-muted-foreground text-center mb-8 leading-relaxed">
                We usually drive everywhere, but San Diego has plenty of options
                depending on where you're headed:
              </p>
              <div className="grid gap-6">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-2">
                    Rideshare
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Our go-to for nights out in the Gaslamp or La Jolla. Uber
                    and Lyft are easy and reliable.
                  </p>
                </div>
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-2">
                    Trolley & Bus
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Great for getting downtown or to the beach. The trolley is
                    fun and surprisingly convenient!
                  </p>
                </div>
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground mb-2">
                    Rental Cars
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Best if you want to explore beyond the city—Coronado, La
                    Jolla, and Balboa Park are easier with a car.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
