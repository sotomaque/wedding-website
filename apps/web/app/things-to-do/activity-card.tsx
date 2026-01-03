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

  return (
    <>
      <div className="w-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        {activity.imageUrl && (
          <div className="relative w-full h-64">
            <Image
              src={activity.imageUrl}
              alt={activity.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-8">
          <div className="flex items-center gap-2 mb-4">
            {activity.emoji && (
              <span className="text-2xl">{activity.emoji}</span>
            )}
            <h3 className="text-3xl font-serif text-foreground">
              {activity.name}
            </h3>
            {isVenue && activity.venueType && (
              <span className="text-xs uppercase tracking-wider bg-accent/10 text-accent px-2 py-1 rounded">
                {activity.venueType}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            {activity.description}
          </p>
          {activity.address && (
            <p className="text-muted-foreground text-sm mb-4">
              📍 {activity.address}
            </p>
          )}

          {/* Interest buttons - only show for non-venue activities with invite code */}
          {!isVenue && inviteCode && (
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={(e) => handleInterestClick(e, "interested")}
                disabled={isPending}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  currentStatus === "interested"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {currentStatus === "interested" ? "✓ Interested" : "Interested"}
              </button>
              <button
                type="button"
                onClick={(e) => handleInterestClick(e, "committed")}
                disabled={isPending}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  currentStatus === "committed"
                    ? "bg-green-500 text-white"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {currentStatus === "committed" ? "✓ I'm Going!" : "I'm Going!"}
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
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {activity.interestedParties.length} guest
                  {activity.interestedParties.length === 1 ? "" : "s"}{" "}
                  interested
                </p>
              </div>
            )}
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
