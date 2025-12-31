"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { Footer } from "@workspace/ui/components/footer";
import { Navigation } from "@workspace/ui/components/navigation";
import { useActiveSection } from "@workspace/ui/hooks/use-active-section";
import Image from "next/image";
import { STORY_CONTENT } from "./constants";

const HERO_PHOTOS = [
  { src: "/our-photos/basilica.jpeg", alt: "Basilica" },
  { src: "/our-photos/bellevue.jpeg", alt: "Bellevue" },
  { src: "/our-photos/carlsbad.jpeg", alt: "Carlsbad" },
  { src: "/our-photos/cdmx.jpeg", alt: "Mexico City" },
  { src: "/our-photos/getty.jpeg", alt: "Getty Museum" },
  { src: "/our-photos/haleiwa.jpeg", alt: "Haleiwa" },
  { src: "/our-photos/hawaii.jpeg", alt: "Hawaii" },
  { src: "/our-photos/juanita-beach.jpeg", alt: "Juanita Beach" },
  { src: "/our-photos/keller.jpeg", alt: "Keller" },
  { src: "/our-photos/kenmore.jpeg", alt: "Kenmore" },
  { src: "/our-photos/knotts-berry.jpeg", alt: "Knotts Berry Farm" },
  { src: "/our-photos/la-jolla.jpeg", alt: "La Jolla" },
  { src: "/our-photos/makua.jpeg", alt: "Makua Beach" },
  { src: "/our-photos/mount-rainer.jpeg", alt: "Mount Rainier" },
  { src: "/our-photos/nicaragua.jpeg", alt: "Nicaragua" },
  { src: "/our-photos/pacific-beach.jpeg", alt: "Pacific Beach" },
  { src: "/our-photos/padres.jpeg", alt: "Padres Game" },
  { src: "/our-photos/phoenix.jpeg", alt: "Phoenix" },
  { src: "/our-photos/seattle.jpeg", alt: "Seattle" },
  { src: "/our-photos/sphere.jpeg", alt: "Sphere Las Vegas" },
  { src: "/our-photos/steamboat-springs.jpeg", alt: "Steamboat Springs" },
  { src: "/our-photos/uw.jpeg", alt: "University of Washington" },
  { src: "/our-photos/vegas.jpeg", alt: "Las Vegas" },
];

export default function Page() {
  const activeSection = useActiveSection();
  return (
    <div className="flex flex-col min-h-screen bg-background">
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
            <div className="relative h-[calc(100dvh-8rem)]">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full h-full"
              >
                <CarouselContent className="h-[calc(100dvh-8rem)]">
                  {HERO_PHOTOS.map((photo, index) => (
                    <CarouselItem key={photo.src} className="h-full">
                      <div className="relative h-full w-full">
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          fill
                          className="object-cover object-center"
                          priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-background/80 hover:bg-background border-accent/30" />
                <CarouselNext className="right-4 bg-background/80 hover:bg-background border-accent/30" />
              </Carousel>
              {/* Overlay with title */}
              <div className="absolute inset-0 flex flex-col items-center text-center justify-center bg-black/30 pointer-events-none">
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif text-white uppercase">
                  Helen & Enrique
                </h1>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section id="story" className="py-24 px-6 bg-card scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
              Our Story
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                <Image
                  src={STORY_CONTENT.images.main.src}
                  alt={STORY_CONTENT.images.main.alt}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                {STORY_CONTENT.paragraphs.map((paragraph) => (
                  <p key={paragraph.substring(0, 20)}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {STORY_CONTENT.images.secondary.map((image) => (
                <div
                  key={image.src}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wedding Details Section */}
        <section id="details" className="py-24 px-6 bg-secondary scroll-mt-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
              Wedding Details
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
            <div className="grid md:grid-cols-2 gap-8">
              {/* Ceremony */}
              <div className="bg-card p-8 rounded-lg shadow-sm border border-accent/30">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-accent"
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
                  <h3 className="text-2xl font-serif text-foreground">
                    Ceremony
                  </h3>
                  <div className="text-muted-foreground space-y-2">
                    <p className="font-medium">4:00 PM</p>
                    <p>The Immaculata Church</p>
                    <p className="text-sm">University of San Diego</p>
                    <p className="text-sm">San Diego, CA 92110</p>
                  </div>
                </div>
              </div>

              {/* Reception */}
              <div className="bg-card p-8 rounded-lg shadow-sm border border-accent/30">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-accent"
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
                  <h3 className="text-2xl font-serif text-foreground">
                    Reception
                  </h3>
                  <div className="text-muted-foreground space-y-2">
                    <p className="font-medium">6:00 PM</p>
                    <p>The Immaculata</p>
                    <p className="text-sm">University of San Diego</p>
                    <p className="text-sm">Dinner, Dancing & Celebration</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attire & Additional Info */}
            <div className="mt-12 bg-card p-8 rounded-lg shadow-sm border border-accent/30">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Attire</h4>
                  <p className="text-muted-foreground text-sm">
                    Formal / Black Tie Optional
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Accommodations
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Hotel blocks available
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Registry
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Details to follow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule Section */}
        <section id="schedule" className="py-24 px-6 bg-card scroll-mt-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-16 text-foreground">
              Schedule
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-16 -mt-12" />
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
                  className="flex gap-6 items-start border-l-2 border-border pl-6"
                >
                  <div className="min-w-[100px] pt-1">
                    <p className="font-semibold text-foreground">{item.time}</p>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-serif text-foreground mb-1">
                      {item.event}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RSVP Section */}
        <section id="rsvp" className="py-24 px-6 bg-secondary scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-6 text-foreground">
              RSVP
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-6" />
            <p className="text-muted-foreground text-center mb-12">
              Please respond by April 30th, 2025
            </p>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden order-2 md:order-1">
                <Image
                  src="/rsvp.png"
                  alt="RSVP"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="bg-card p-8 md:p-12 rounded-lg shadow-sm border border-border order-1 md:order-2">
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-left">
                      <label
                        htmlFor="firstName"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                        placeholder="John"
                      />
                    </div>
                    <div className="text-left">
                      <label
                        htmlFor="lastName"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="attending"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Will you be attending?
                    </label>
                    <select
                      id="attending"
                      className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                    >
                      <option>Joyfully accepts</option>
                      <option>Regretfully declines</option>
                    </select>
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="guestCount"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Number of Guests
                    </label>
                    <input
                      id="guestCount"
                      type="number"
                      min="1"
                      max="5"
                      className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                      placeholder="1"
                    />
                  </div>
                  <div className="text-left">
                    <label
                      htmlFor="dietary"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Dietary Restrictions
                    </label>
                    <textarea
                      id="dietary"
                      rows={3}
                      className="w-full px-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
                      placeholder="Please let us know of any dietary restrictions..."
                    />
                  </div>
                  <Button size="lg" className="w-full font-semibold">
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
