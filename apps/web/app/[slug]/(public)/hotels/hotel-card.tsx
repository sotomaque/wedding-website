"use client";

import Image from "next/image";
import { useTransition } from "react";
import { toast } from "sonner";
import type { Hotel, HotelWithInterest } from "./actions";
import { setHotelInterest } from "./actions";
import { WhosInterestedPopover } from "./whos-interested-popover";

interface HotelCardProps {
  hotel: Hotel | HotelWithInterest;
  inviteCode?: string;
  index?: number;
}

function isHotelWithInterest(
  hotel: Hotel | HotelWithInterest,
): hotel is HotelWithInterest {
  return "userInterest" in hotel;
}

export function HotelCard({ hotel, inviteCode, index = 0 }: HotelCardProps) {
  const [isPending, startTransition] = useTransition();

  const hasInterestData = isHotelWithInterest(hotel);
  const currentStatus = hasInterestData ? hotel.userInterest.status : null;
  const imageOnLeft = index % 2 === 0;

  const handleInterestClick = (
    e: React.MouseEvent,
    status: "interested" | "booked",
  ) => {
    e.stopPropagation();
    if (!inviteCode) return;

    if (currentStatus === status) {
      startTransition(async () => {
        const result = await setHotelInterest({
          hotelId: hotel.id,
          inviteCode,
          status: null,
        });
        if (!result.success) {
          toast.error(result.error ?? "Failed to update");
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await setHotelInterest({
        hotelId: hotel.id,
        inviteCode,
        status,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to update");
      }
    });
  };

  const getHotelTypeBadge = (type: string | null) => {
    switch (type) {
      case "luxury":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50/95 backdrop-blur-sm text-purple-700 text-xs font-medium border border-purple-200 shadow-lg">
            <span>✨</span> Luxury
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50/95 backdrop-blur-sm text-blue-700 text-xs font-medium border border-blue-200 shadow-lg">
            <span>🏨</span> Mid-Range
          </span>
        );
      case "budget":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50/95 backdrop-blur-sm text-green-700 text-xs font-medium border border-green-200 shadow-lg">
            <span>💰</span> Budget-Friendly
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="group relative bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image Section */}
        <div
          className={`relative ${imageOnLeft ? "md:order-1" : "md:order-2"}`}
        >
          {hotel.imageUrl ? (
            <div className="relative w-full h-64 md:h-full min-h-[320px]">
              <Image
                src={hotel.imageUrl}
                alt={hotel.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="w-full h-64 md:h-full min-h-[320px] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
              <span className="text-6xl opacity-20">🏨</span>
            </div>
          )}
          {hotel.hotelType && (
            <div className="absolute top-4 left-4">
              {getHotelTypeBadge(hotel.hotelType)}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div
          className={`p-8 flex flex-col ${imageOnLeft ? "md:order-2" : "md:order-1"}`}
        >
          <div className="flex-1">
            <h3 className="text-2xl md:text-3xl font-serif text-foreground mb-3 leading-tight">
              {hotel.name}
            </h3>

            {hotel.description && (
              <p className="text-muted-foreground mb-5 leading-relaxed text-sm md:text-base">
                {hotel.description}
              </p>
            )}

            <div className="space-y-2.5 mb-5">
              {hotel.distanceToVenue && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-0.5">📍</span>
                  <span className="text-foreground font-medium">
                    {hotel.distanceToVenue}
                  </span>
                </div>
              )}
              {hotel.websiteUrl && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-accent mt-0.5">🔗</span>
                  <a
                    href={hotel.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline underline-offset-2"
                  >
                    Visit website
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Interest buttons */}
          {inviteCode && (
            <div className="flex flex-wrap items-center gap-2.5 pt-5 border-t border-border/50">
              <button
                type="button"
                onClick={(e) => handleInterestClick(e, "interested")}
                disabled={isPending}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  currentStatus === "interested"
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {currentStatus === "interested" ? "✓ Interested" : "Interested"}
              </button>
              <button
                type="button"
                onClick={(e) => handleInterestClick(e, "booked")}
                disabled={isPending}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  currentStatus === "booked"
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {currentStatus === "booked" ? "✓ Booked" : "Booked"}
              </button>

              {hasInterestData && hotel.interestedParties.length > 0 && (
                <WhosInterestedPopover parties={hotel.interestedParties} />
              )}
            </div>
          )}

          {!inviteCode &&
            hasInterestData &&
            hotel.interestedParties.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  {hotel.interestedParties.length} guest
                  {hotel.interestedParties.length === 1 ? "" : "s"} interested
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
