"use client";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { useState } from "react";
import { WEDDING_DATE } from "@/app/constants";
import type { ActivityWithInterest } from "./actions";

interface InterestCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityName: string;
  status: "interested" | "committed";
  currentDate: string | null;
  interestedParties: ActivityWithInterest["interestedParties"];
  onConfirm: (date: string | null) => void;
  isPending: boolean;
}

export function InterestCalendarModal({
  open,
  onOpenChange,
  activityName,
  status,
  currentDate,
  interestedParties,
  onConfirm,
  isPending,
}: InterestCalendarModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined,
  );

  // Group parties by date
  const partiesByDate = new Map<string, typeof interestedParties>();
  for (const party of interestedParties) {
    if (party.plannedDate) {
      const existing = partiesByDate.get(party.plannedDate) || [];
      existing.push(party);
      partiesByDate.set(party.plannedDate, existing);
    }
  }

  // Get dates that have interested parties
  const datesWithInterest = Array.from(partiesByDate.keys()).map(
    (d) => new Date(d),
  );

  // Get parties for selected date
  const selectedDateStr = selectedDate
    ? (selectedDate.toISOString().split("T")[0] ?? null)
    : null;
  const partiesOnSelectedDate = selectedDateStr
    ? (partiesByDate.get(selectedDateStr) ?? [])
    : [];

  const handleConfirm = () => {
    onConfirm(selectedDateStr);
  };

  const handleSkip = () => {
    onConfirm(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <SheetTitle>
            {status === "committed" ? "I'm Going!" : "Interested"}
          </SheetTitle>
          <SheetDescription>
            When are you planning to visit {activityName}?
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              defaultMonth={WEDDING_DATE}
              modifiers={{
                hasInterest: datesWithInterest,
              }}
              modifiersClassNames={{
                hasInterest:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-accent after:rounded-full",
              }}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>

          {/* Show who else is going on selected date */}
          {selectedDateStr && partiesOnSelectedDate.length > 0 && (
            <div className="rounded-md bg-accent/10 p-3">
              <p className="text-sm font-medium text-accent mb-2">
                Others planning to go on{" "}
                {selectedDate?.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                :
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {partiesOnSelectedDate.map((party) => (
                  <li key={party.inviteCode}>
                    {party.primaryName}
                    {party.plusOneName && ` & ${party.plusOneName}`}
                    <span className="ml-2 text-xs">
                      {party.status === "committed" ? "✓ Going" : "Interested"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legend for dots */}
          {datesWithInterest.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              <span className="inline-block w-2 h-2 bg-accent rounded-full mr-1" />
              Dates with other guests interested
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              disabled={isPending}
            >
              Skip date
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
