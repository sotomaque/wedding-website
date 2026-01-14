import Image from "next/image";
import type { HotelWithInterest } from "./actions";
import { HotelCard } from "./hotel-card";

interface HotelsContentProps {
  hotels: HotelWithInterest[];
  inviteCode?: string;
  heroImage: string;
}

export function HotelsContent({
  hotels,
  inviteCode,
  heroImage,
}: HotelsContentProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden h-[600px] flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="San Diego Hotels"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative max-w-screen-2xl mx-auto px-4 md:px-12 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-4">
              <span className="text-4xl">🏨</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white mb-6">
              Where to Stay
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-4 max-w-2xl mx-auto">
              We've curated a selection of hotels near our reception venue at
              The Headquarters at Seaport. From luxury waterfront resorts to
              charming boutique stays, find the perfect spot for your visit.
            </p>
            {inviteCode && (
              <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full text-sm font-medium">
                <span>✨</span>
                <span>
                  Click "Interested" or "Booked" to let us know your plans!
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* All Hotels in Grid */}
      <section className="relative bg-gradient-to-b from-secondary/30 to-background">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid gap-6">
              {hotels.map((hotel, index) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  inviteCode={inviteCode}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Group Booking CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/10 via-card to-secondary/30">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-12 w-full py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block bg-accent/10 backdrop-blur-sm rounded-2xl p-8 border border-accent/20">
              <h2 className="text-3xl font-serif text-foreground mb-4">
                Interested in Group Booking?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Mark "Interested" on any hotel above and we'll work with our
                travel agent to secure group rates or room blocks.
              </p>
              <p className="text-sm text-muted-foreground">
                Once you've booked, update your status to "Booked" so others can
                see where everyone is staying!
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
