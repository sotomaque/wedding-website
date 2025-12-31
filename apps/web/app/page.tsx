"use client";

import { Button } from "@workspace/ui/components/button";
import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import { useActiveSection } from "@workspace/ui/hooks/use-active-section";
import Image from "next/image";

export default function Page() {
  const activeSection = useActiveSection();
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      {/* Navigation */}
      <Navigation
        brandText="H & E"
        leftLinks={[
          { href: "#story", label: "Our Story" },
          { href: "#details", label: "Details" },
          { href: "#schedule", label: "Schedule" },
        ]}
        rightLinks={[
          { href: "/things-to-do", label: "Things To Do in San Diego" },
          { href: "#rsvp", label: "RSVP" },
        ]}
        activeSection={activeSection}
      />

      <main className="grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
            <div className="relative h-[calc(100dvh-8rem)] overflow-hidden">
              <Image
                src="/hero.webp"
                alt="Wedding hero"
                fill
                className="object-cover object-top saturate-50"
                priority
              />
              {/* Overlay with title */}
              <div className="absolute inset-0 flex flex-col items-center text-center justify-center bg-black/30">
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-white uppercase">
                  Helen & Enrique
                </h1>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section id="story" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-neutral-900">
              Our Story
            </h2>
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                <Image
                  src="/intro1.webp"
                  alt="Couple portrait"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-6 text-neutral-700 leading-relaxed">
                <p>
                  We met in the fall of 2018 at a coffee shop in San Francisco.
                  What started as a chance encounter over a shared love of
                  cappuccinos quickly blossomed into something extraordinary.
                </p>
                <p>
                  Five years later, on a trip to Big Sur, Enrique got down on
                  one knee at sunset overlooking the Pacific Ocean. Through
                  tears of joy, Anna said yes.
                </p>
                <p>
                  Now we're excited to celebrate our love with the people who
                  matter most to us. Join us for a weekend of joy, laughter, and
                  unforgettable memories.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src="/intro2.webp"
                  alt="Couple moment"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src="/intro3.webp"
                  alt="Couple together"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Wedding Details Section */}
        <section id="details" className="py-24 px-6 bg-neutral-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-neutral-900">
              Wedding Details
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Ceremony */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-neutral-200">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-neutral-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <title>Clock icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-serif text-neutral-900">
                    Ceremony
                  </h3>
                  <div className="text-neutral-600 space-y-2">
                    <p className="font-medium">4:00 PM</p>
                    <p>The Immaculata Church</p>
                    <p className="text-sm">University of San Diego</p>
                    <p className="text-sm">San Diego, CA 92110</p>
                  </div>
                </div>
              </div>

              {/* Reception */}
              <div className="bg-white p-8 rounded-lg shadow-sm border border-neutral-200">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-neutral-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <title>Celebration icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-serif text-neutral-900">
                    Reception
                  </h3>
                  <div className="text-neutral-600 space-y-2">
                    <p className="font-medium">6:00 PM</p>
                    <p>The Immaculata</p>
                    <p className="text-sm">University of San Diego</p>
                    <p className="text-sm">Dinner, Dancing & Celebration</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attire & Additional Info */}
            <div className="mt-12 bg-white p-8 rounded-lg shadow-sm border border-neutral-200">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">
                    Attire
                  </h4>
                  <p className="text-neutral-600 text-sm">
                    Formal / Black Tie Optional
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">
                    Accommodations
                  </h4>
                  <p className="text-neutral-600 text-sm">
                    Hotel blocks available
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-2">
                    Registry
                  </h4>
                  <p className="text-neutral-600 text-sm">Details to follow</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule Section */}
        <section id="schedule" className="py-24 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-neutral-900">
              Schedule
            </h2>
            <div className="space-y-8">
              {[
                {
                  id: "arrival",
                  time: "3:30 PM",
                  event: "Guest Arrival",
                  description: "Please arrive early to find your seats",
                },
                {
                  id: "ceremony",
                  time: "4:00 PM",
                  event: "Ceremony Begins",
                  description: "The celebration starts",
                },
                {
                  id: "cocktail",
                  time: "4:30 PM",
                  event: "Cocktail Hour",
                  description: "Drinks and hors d'oeuvres in the garden",
                },
                {
                  id: "reception",
                  time: "6:00 PM",
                  event: "Reception",
                  description: "Dinner, toasts, and dancing",
                },
                {
                  id: "lastdance",
                  time: "10:00 PM",
                  event: "Last Dance",
                  description: "Send off under the stars",
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex gap-6 items-start border-l-2 border-neutral-200 pl-6"
                >
                  <div className="min-w-[100px] pt-1">
                    <p className="font-semibold text-neutral-900">
                      {item.time}
                    </p>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-serif text-neutral-900 mb-1">
                      {item.event}
                    </h3>
                    <p className="text-neutral-600 text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RSVP Section */}
        <section id="rsvp" className="py-24 px-6 bg-neutral-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-6 text-neutral-900">
              RSVP
            </h2>
            <p className="text-neutral-600 text-center mb-12">
              Please respond by April 30th, 2025
            </p>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden order-2 md:order-1">
                <Image
                  src="/rsvp.webp"
                  alt="RSVP"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="bg-white p-8 md:p-12 rounded-lg shadow-sm border border-neutral-200 order-1 md:order-2">
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-left">
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium text-neutral-700 mb-2"
                      >
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                        placeholder="John"
                      />
                    </div>
                    <div className="text-left">
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium text-neutral-700 mb-2"
                      >
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="attending"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Will you be attending?
                    </label>
                    <select
                      id="attending"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                    >
                      <option>Joyfully accepts</option>
                      <option>Regretfully declines</option>
                    </select>
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="guestCount"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Number of Guests
                    </label>
                    <input
                      id="guestCount"
                      type="number"
                      min="1"
                      max="5"
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="dietary"
                      className="block text-sm font-medium text-neutral-700 mb-2"
                    >
                      Dietary Restrictions
                    </label>
                    <textarea
                      id="dietary"
                      rows={3}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none"
                      placeholder="Please let us know of any dietary restrictions..."
                    />
                  </div>
                  <Button size="lg" className="w-full">
                    Submit RSVP
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
