"use client";

import type { Activity, ActivityWithInterest } from "./actions";
import { ActivityCard } from "./activity-card";

interface ThingsToDoContentProps {
  activities: ActivityWithInterest[];
  venues: Activity[];
  inviteCode?: string;
}

export function ThingsToDoContent({
  activities,
  venues,
  inviteCode,
}: ThingsToDoContentProps) {
  // Separate venues by type
  const ceremonyVenue = venues.find((v) => v.venueType === "ceremony");
  const receptionVenue = venues.find((v) => v.venueType === "reception");
  const venuesList = [ceremonyVenue, receptionVenue].filter(
    Boolean,
  ) as Activity[];

  // Get non-venue activities
  const thingsToDoActivities = activities.filter((a) => !a.isVenue);

  return (
    <>
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
            {inviteCode && (
              <p className="mt-6 text-sm text-accent font-medium">
                Mark your interest below to see who else is planning to visit!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Wedding Venues Section */}
      <section className="relative bg-secondary">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-12 text-foreground">
              Wedding Venues
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-12 -mt-8" />
            <div className="grid gap-8">
              {venuesList.map((venue) => (
                <ActivityCard key={venue.id} activity={venue} isVenue />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Things to Do Section */}
      <section className="relative overflow-hidden bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-12 text-foreground">
              Things to Do
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-12 -mt-8" />
            {inviteCode && (
              <p className="text-center text-sm text-muted-foreground mb-8">
                Click "Interested" or "I'm Going" to let others know your plans!
              </p>
            )}
            <div className="grid gap-8">
              {thingsToDoActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  inviteCode={inviteCode}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Food & Drink Section */}
      <section className="relative overflow-hidden bg-secondary">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-12 text-foreground">
              Where We Love to Eat & Drink
            </h2>
            <div className="w-24 h-1 bg-accent mx-auto mb-12 -mt-8" />
            <div className="grid gap-8">
              <div className="bg-card p-8 rounded-lg border border-border">
                <h3 className="text-2xl font-serif text-foreground mb-4">
                  Our Brewery Picks
                </h3>
                <p className="text-muted-foreground mb-4">
                  San Diego's craft beer scene is world-class, and we've tried
                  our fair share! These are our favorites for a casual afternoon
                  or evening out.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Ballast Point - We love their Sculpin IPA</li>
                  <li>• Stone Brewing - Amazing food and great patio</li>
                  <li>• Modern Times - Perfect for a relaxed vibe</li>
                  <li>• Karl Strauss - A San Diego classic</li>
                </ul>
              </div>

              <div className="bg-card p-8 rounded-lg border border-border">
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
      <section className="relative overflow-hidden bg-card">
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
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">
                  Rideshare
                </h4>
                <p className="text-muted-foreground text-sm">
                  Our go-to for nights out in the Gaslamp or La Jolla. Uber and
                  Lyft are easy and reliable.
                </p>
              </div>
              <div className="bg-secondary p-6 rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">
                  Trolley & Bus
                </h4>
                <p className="text-muted-foreground text-sm">
                  Great for getting downtown or to the beach. The trolley is fun
                  and surprisingly convenient!
                </p>
              </div>
              <div className="bg-secondary p-6 rounded-lg border border-border">
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
    </>
  );
}
