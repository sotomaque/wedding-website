"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate, getSummaryText } from "./utils";

interface Party {
  inviteCode: string;
  primaryName: string;
  plusOneName: string | null;
  status: "interested" | "committed";
  plannedDate: string | null;
}

interface WhosGoingPopoverProps {
  parties: Party[];
}

export function WhosGoingPopover({ parties }: WhosGoingPopoverProps) {
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
  const committedParties = parties.filter((p) => p.status === "committed");

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

          {committedParties.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-green-600 mb-1">
                Going ({committedParties.length})
              </p>
              <ul className="space-y-2">
                {committedParties.map((party) => (
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
                    {party.plannedDate && (
                      <p className="text-xs text-muted-foreground ml-5">
                        📅 {formatDate(party.plannedDate)}
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
                    {party.plannedDate && (
                      <p className="text-xs text-muted-foreground/70 ml-5">
                        📅 {formatDate(party.plannedDate)}
                      </p>
                    )}
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
