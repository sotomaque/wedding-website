"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import type { Activity, ActivityWithInterest } from "./actions";
import { setActivityInterest } from "./actions";
import { InterestCalendarModal } from "./interest-calendar-modal";
import { WhosGoingPopover } from "./whos-going-popover";

interface ActivityCardProps {
  activity: Activity | ActivityWithInterest;
  inviteCode?: string;
  isVenue?: boolean;
  index?: number;
}

function isActivityWithInterest(
  activity: Activity | ActivityWithInterest,
): activity is ActivityWithInterest {
  return "userInterest" in activity;
}

export function ActivityCard({
  activity,
  inviteCode,
  isVenue,
  index = 0,
}: ActivityCardProps) {
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    "interested" | "committed" | null
  >(null);

  const hasInterestData = isActivityWithInterest(activity);
  const currentStatus = hasInterestData ? activity.userInterest.status : null;
  const currentDate = hasInterestData
    ? activity.userInterest.plannedDate
    : null;
  const imageOnLeft = index % 2 === 0;

  const handleInterestClick = (
    e: React.MouseEvent,
    status: "interested" | "committed",
  ) => {
    e.stopPropagation();
    if (!inviteCode) return;

    // If clicking the same status, remove it (no modal needed)
    if (currentStatus === status) {
      startTransition(async () => {
        await setActivityInterest({
          activityId: activity.id,
          inviteCode,
          status: null,
        });
      });
      return;
    }

    // Open modal to select date
    setPendingStatus(status);
    setModalOpen(true);
  };

  const handleModalConfirm = (date: string | null) => {
    if (!inviteCode || !pendingStatus) return;

    startTransition(async () => {
      const result = await setActivityInterest({
        activityId: activity.id,
        inviteCode,
        status: pendingStatus,
        plannedDate: date,
      });

      if (result.success) {
        setModalOpen(false);
        setPendingStatus(null);
      }
    });
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setModalOpen(false);
      setPendingStatus(null);
    }
  };

  const getVenueTypeBadge = (type: string | null) => {
    if (!type) return null;

    switch (type) {
      case "ceremony":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50/95 backdrop-blur-sm text-purple-700 text-xs font-medium border border-purple-200 shadow-lg">
            <span>⛪️</span> Ceremony
          </span>
        );
      case "reception":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50/95 backdrop-blur-sm text-blue-700 text-xs font-medium border border-blue-200 shadow-lg">
            <span>🎉</span> Reception
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="group relative bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div
            className={`relative ${imageOnLeft ? "md:order-1" : "md:order-2"}`}
          >
            {activity.imageUrl ? (
              <div className="relative w-full h-64 md:h-full min-h-[320px]">
                <Image
                  src={activity.imageUrl}
                  alt={activity.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="w-full h-64 md:h-full min-h-[320px] bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
                <span className="text-6xl opacity-20">
                  {activity.emoji || "📍"}
                </span>
              </div>
            )}
            {isVenue && activity.venueType && (
              <div className="absolute top-4 left-4">
                {getVenueTypeBadge(activity.venueType)}
              </div>
            )}
          </div>

          {/* Content Section */}
          <div
            className={`p-8 flex flex-col ${imageOnLeft ? "md:order-2" : "md:order-1"}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {activity.emoji && !isVenue && (
                  <span className="text-3xl">{activity.emoji}</span>
                )}
                <h3 className="text-2xl md:text-3xl font-serif text-foreground leading-tight">
                  {activity.name}
                </h3>
              </div>

              {activity.description && (
                <p className="text-muted-foreground mb-5 leading-relaxed text-sm md:text-base">
                  {activity.description}
                </p>
              )}

              {activity.address && (
                <div className="flex items-start gap-2 text-sm mb-5">
                  <span className="text-accent mt-0.5">📍</span>
                  <span className="text-foreground font-medium">
                    {activity.address}
                  </span>
                </div>
              )}
            </div>

            {/* Interest buttons - only show for non-venue activities with invite code */}
            {!isVenue && inviteCode && (
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
                  {currentStatus === "interested"
                    ? "✓ Interested"
                    : "Interested"}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleInterestClick(e, "committed")}
                  disabled={isPending}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    currentStatus === "committed"
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                      : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                  } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {currentStatus === "committed"
                    ? "✓ I'm Going!"
                    : "I'm Going!"}
                </button>

                {/* Show selected date if any */}
                {currentDate && (
                  <span className="text-sm text-muted-foreground">
                    📅{" "}
                    {new Date(currentDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}

                {/* Who's going popover */}
                {hasInterestData && activity.interestedParties.length > 0 && (
                  <WhosGoingPopover parties={activity.interestedParties} />
                )}
              </div>
            )}

            {/* Show who's going for non-logged-in users */}
            {!isVenue &&
              !inviteCode &&
              hasInterestData &&
              activity.interestedParties.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    {activity.interestedParties.length} guest
                    {activity.interestedParties.length === 1 ? "" : "s"}{" "}
                    interested
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {hasInterestData && pendingStatus && (
        <InterestCalendarModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          activityName={activity.name}
          status={pendingStatus}
          currentDate={currentDate}
          interestedParties={activity.interestedParties}
          onConfirm={handleModalConfirm}
          isPending={isPending}
        />
      )}
    </>
  );
}
