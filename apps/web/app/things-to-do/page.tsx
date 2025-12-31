"use client";

import { Navigation } from "@workspace/ui/components/navigation";
import Image from "next/image";

export default function ThingsToDoPage() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Navigation
        brandText="H & E"
        leftLinks={[
          { href: "/#story", label: "Our Story" },
          { href: "/#details", label: "Details" },
          { href: "/#schedule", label: "Schedule" },
        ]}
        rightLinks={[
          { href: "/things-to-do", label: "Things To Do" },
          { href: "/#rsvp", label: "RSVP" },
        ]}
      />

      <main className="grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-neutral-900 mb-6">
                Our Favorite San Diego Spots
              </h1>
              <p className="text-lg text-neutral-600 leading-relaxed">
                We're so excited to share our favorite corners of San Diego with you!
                Whether you're looking for ocean views, amazing food, or a bit of local culture,
                these are the places we love and think you will too.
              </p>
            </div>
          </div>
        </section>

        {/* Activities Grid */}
        <section className="py-24 px-6 bg-neutral-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Balboa Park */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">Balboa Park</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    Balboa Park
                  </h3>
                  <p className="text-neutral-600 text-sm mb-4">
                    One of our favorite spots for a lazy Sunday stroll. The gardens are stunning,
                    and there's always something new to discover. Pro tip: grab coffee at the
                    Japanese Friendship Garden!
                  </p>
                  <p className="text-neutral-500 text-xs">
                    📍 1549 El Prado, San Diego
                  </p>
                </div>
              </div>

              {/* La Jolla Cove */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">La Jolla Cove</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    La Jolla Cove
                  </h3>
                  <p className="text-neutral-600 text-sm mb-4">
                    We love watching the sea lions here—they're hilarious! The views are
                    breathtaking, especially at sunset. Walk along the coastal path and
                    you might spot some seals too.
                  </p>
                  <p className="text-neutral-500 text-xs">
                    📍 1100 Coast Blvd, La Jolla
                  </p>
                </div>
              </div>

              {/* Gaslamp Quarter */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">Gaslamp Quarter</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    Gaslamp Quarter
                  </h3>
                  <p className="text-neutral-600 text-sm mb-4">
                    Our go-to for a night out! The historic buildings are beautiful, and
                    there are so many great rooftop bars and restaurants. We especially love
                    the energy here on weekend evenings.
                  </p>
                  <p className="text-neutral-500 text-xs">
                    📍 Downtown San Diego
                  </p>
                </div>
              </div>

              {/* Old Town */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">Old Town</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    Old Town San Diego
                  </h3>
                  <p className="text-neutral-600 text-sm mb-4">
                    A step back in time with some seriously good Mexican food. We always
                    bring out-of-town visitors here—the margaritas and handmade tortillas
                    are incredible!
                  </p>
                  <p className="text-neutral-500 text-xs">
                    📍 4002 Wallace St, San Diego
                  </p>
                </div>
              </div>

              {/* Coronado Beach */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">Coronado Beach</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    Coronado Beach
                  </h3>
                  <p className="text-neutral-600 text-sm mb-4">
                    Hands down our favorite beach in San Diego. The sand sparkles (really!),
                    the water is perfect, and the Hotel del Coronado is such an iconic spot
                    for a sunset cocktail.
                  </p>
                  <p className="text-neutral-500 text-xs">
                    📍 1500 Orange Ave, Coronado
                  </p>
                </div>
              </div>

              {/* Seaport Village */}
              <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200">
                <div className="relative aspect-[4/3]">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">Seaport Village</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-serif text-neutral-900 mb-3">
                    Seaport Village
                  </h3>
                  <p className="text-neutral-600 text-sm mb-4">
                    Perfect for a relaxing afternoon walk by the water. We love the bay views,
                    the little shops, and grabbing ice cream while watching the boats go by.
                  </p>
                  <p className="text-neutral-500 text-xs">
                    📍 849 W Harbor Dr, San Diego
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Food & Drink Section */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-neutral-900">
              Where We Love to Eat & Drink
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-neutral-50 p-8 rounded-lg border border-neutral-200">
                <h3 className="text-2xl font-serif text-neutral-900 mb-4">
                  Our Brewery Picks
                </h3>
                <p className="text-neutral-600 mb-4">
                  San Diego's craft beer scene is world-class, and we've tried our fair share!
                  These are our favorites for a casual afternoon or evening out.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Ballast Point - We love their Sculpin IPA</li>
                  <li>• Stone Brewing - Amazing food and great patio</li>
                  <li>• Modern Times - Perfect for a relaxed vibe</li>
                  <li>• Karl Strauss - A San Diego classic</li>
                </ul>
              </div>

              <div className="bg-neutral-50 p-8 rounded-lg border border-neutral-200">
                <h3 className="text-2xl font-serif text-neutral-900 mb-4">
                  Must-Try Restaurants
                </h3>
                <p className="text-neutral-600 mb-4">
                  These are the places we find ourselves coming back to again and again.
                  Trust us, you won't be disappointed!
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Puesto - Best tacos in town, hands down</li>
                  <li>• Hodad's - Massive burgers worth the wait</li>
                  <li>• The Fish Market - Fresh catch with harbor views</li>
                  <li>• Oscar's - Our fish taco spot near the beach</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Around */}
        <section className="py-24 px-6 bg-neutral-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-serif mb-8 text-neutral-900">
              Getting Around the City
            </h2>
            <p className="text-neutral-600 leading-relaxed mb-8">
              We usually drive everywhere, but San Diego has plenty of options
              depending on where you're headed:
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <h4 className="font-semibold text-neutral-900 mb-2">
                  Rideshare
                </h4>
                <p className="text-neutral-600 text-sm">
                  Our go-to for nights out in the Gaslamp or La Jolla. Uber and Lyft
                  are easy and reliable.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <h4 className="font-semibold text-neutral-900 mb-2">
                  Trolley & Bus
                </h4>
                <p className="text-neutral-600 text-sm">
                  Great for getting downtown or to the beach. The trolley is fun and
                  surprisingly convenient!
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-neutral-200">
                <h4 className="font-semibold text-neutral-900 mb-2">
                  Rental Cars
                </h4>
                <p className="text-neutral-600 text-sm">
                  Best if you want to explore beyond the city—Coronado, La Jolla,
                  and Balboa Park are easier with a car.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-neutral-200">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-2xl font-serif text-neutral-900">
            We can't wait to celebrate with you!
          </p>
          <p className="text-neutral-600 text-sm">
            For questions, please contact us at{" "}
            <a
              href="mailto:wedding@example.com"
              className="underline hover:text-neutral-900"
            >
              wedding@example.com
            </a>
          </p>
          <p className="text-neutral-400 text-xs pt-4">
            © 2025 Helen & Enrique
          </p>
        </div>
      </footer>
    </div>
  );
}
