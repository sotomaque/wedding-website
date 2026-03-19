import Image from "next/image";
import type { Activity, ActivityWithInterest } from "./actions";
import { ActivityCard } from "./activity-card";

interface ThingsToDoContentProps {
  activities: ActivityWithInterest[];
  venues: Activity[];
  beaches: ActivityWithInterest[];
  inviteCode?: string;
  heroImage: string;
}

export function ThingsToDoContent({
  activities,
  venues,
  beaches,
  inviteCode,
  heroImage,
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
      <section className="relative overflow-hidden h-150 flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="San Diego"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/50 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-4">
              <span className="text-4xl">🌴</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white mb-6">
              Explore San Diego
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
              We're excited to share our favorite corners of San Diego with you!
              From stunning beaches to world-class dining, discover the places
              we love.
            </p>
            {inviteCode && (
              <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full text-sm font-medium">
                <span>✨</span>
                <span>
                  Mark your interest to see who else is planning to visit!
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Wedding Venues Section */}
      <section className="relative bg-linear-to-b from-secondary/30 to-background">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                Wedding Venues
              </h2>
              <p className="text-muted-foreground">Where we'll celebrate</p>
            </div>
            <div className="grid gap-6">
              {venuesList.map((venue, index) => (
                <ActivityCard
                  key={venue.id}
                  activity={venue}
                  index={index}
                  isVenue
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Things to Do Section */}
      <section className="relative bg-linear-to-b from-background to-secondary/20">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                Things to Do
              </h2>
              <p className="text-muted-foreground">
                Our favorite spots to explore in the city
              </p>
            </div>
            <div className="grid gap-6">
              {thingsToDoActivities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  inviteCode={inviteCode}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Beaches Section */}
      <section className="relative bg-linear-to-b from-secondary/20 to-background">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                Our Favorite Beaches
              </h2>
              <p className="text-muted-foreground">
                The best spots to catch some sun and surf
              </p>
            </div>
            <div className="grid gap-6">
              {beaches.map((beach, index) => (
                <ActivityCard
                  key={beach.id}
                  activity={beach}
                  inviteCode={inviteCode}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Food & Drink Section */}
      <section className="relative bg-linear-to-br from-accent/5 via-card to-secondary/30">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-serif text-foreground mb-4">
                Where We Love to Eat & Drink
              </h2>
              <p className="text-muted-foreground">
                San Diego's best breweries and restaurants
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-4">🍺</div>
                <h3 className="text-2xl font-serif text-foreground mb-4">
                  Our Brewery Picks
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  San Diego's craft beer scene is world-class. These are our
                  favorites.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Ballast Point</strong> - We love their Sculpin IPA
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Stone Brewing</strong> - Amazing food and great
                      patio
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Modern Times</strong> - Perfect for a relaxed vibe
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Karl Strauss</strong> - A San Diego classic
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-4">🌮</div>
                <h3 className="text-2xl font-serif text-foreground mb-4">
                  Must-Try Restaurants
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Places we find ourselves coming back to again and again.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Puesto</strong> - Best tacos in town, hands down
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Hodad's</strong> - Massive burgers worth the wait
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>The Fish Market</strong> - Fresh catch with harbor
                      views
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span className="text-foreground">
                      <strong>Oscar's</strong> - Our fish taco spot near the
                      beach
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
