"use client";

import { useEffect, useRef, useState } from "react";

interface Party {
  inviteCode: string;
  primaryName: string;
  plusOneName: string | null;
  status: "interested" | "booked";
  checkInDate: string | null;
  checkOutDate: string | null;
  numberOfRooms: number | null;
}

interface WhosInterestedPopoverProps {
  parties: Party[];
}

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getSummaryText(parties: Party[]) {
  const bookedCount = parties.filter((p) => p.status === "booked").length;
  const interestedCount = parties.filter(
    (p) => p.status === "interested",
  ).length;

  if (bookedCount > 0 && interestedCount > 0) {
    return `${bookedCount} booked, ${interestedCount} interested`;
  }
  if (bookedCount > 0) {
    return `${bookedCount} booked`;
  }
  return `${interestedCount} interested`;
}

export function WhosInterestedPopover({ parties }: WhosInterestedPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const interestedParties = parties.filter((p) => p.status === "interested");
  const bookedParties = parties.filter((p) => p.status === "booked");

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <span className="text-base">👀</span>
        <span>{getSummaryText(parties)}</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Who's interested"
          className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-lg shadow-lg p-4 z-50"
        >
          <h4 className="font-semibold text-sm text-foreground mb-3">
            Who's Interested
          </h4>

          {bookedParties.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-green-600 mb-1">
                Booked ({bookedParties.length})
              </p>
              <ul className="space-y-2">
                {bookedParties.map((party) => (
                  <li
                    key={party.inviteCode}
                    className="text-sm text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>
                        {party.primaryName}
                        {party.plusOneName && ` & ${party.plusOneName}`}
                      </span>
                    </div>
                    {(party.checkInDate || party.checkOutDate) && (
                      <p className="text-xs text-muted-foreground ml-5">
                        📅 {formatDate(party.checkInDate)} -{" "}
                        {formatDate(party.checkOutDate)}
                      </p>
                    )}
                    {party.numberOfRooms && (
                      <p className="text-xs text-muted-foreground ml-5">
                        🏠 {party.numberOfRooms} room
                        {party.numberOfRooms > 1 ? "s" : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interestedParties.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-600 mb-1">
                Interested ({interestedParties.length})
              </p>
              <ul className="space-y-2">
                {interestedParties.map((party) => (
                  <li
                    key={party.inviteCode}
                    className="text-sm text-muted-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">○</span>
                      <span>
                        {party.primaryName}
                        {party.plusOneName && ` & ${party.plusOneName}`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
