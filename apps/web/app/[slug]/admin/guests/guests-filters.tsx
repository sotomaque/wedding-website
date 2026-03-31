"use client";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { EventOption } from "./actions";

interface GuestsFiltersProps {
  events?: EventOption[];
}

export function GuestsFilters({ events = [] }: GuestsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();
  const [open, setOpen] = useState(false);

  const currentSide = searchParams.get("side") as "bride" | "groom" | null;
  const currentStatuses =
    searchParams.get("rsvpStatus")?.split(",").filter(Boolean) ?? [];
  const currentList = searchParams.get("list") as "a" | "b" | "c" | null;
  const currentFamily = searchParams.get("family") as "true" | "false" | null;
  const currentUnder21 = searchParams.get("under21") as "true" | "false" | null;
  const currentThreeAndUnder = searchParams.get("threeAndUnder") as
    | "true"
    | "false"
    | null;
  const currentIsPlusOne = searchParams.get("isPlusOne") as
    | "true"
    | "false"
    | null;
  const currentEmailStatus = searchParams.get("emailStatus") as
    | "not_sent"
    | "sent"
    | "resent"
    | null;
  const currentBridalParty = searchParams.get("bridalParty") as
    | "groomsman"
    | "best_man"
    | "bridesmaid"
    | "maid_of_honor"
    | "any"
    | null;
  const currentEvents =
    searchParams.get("events")?.split(",").filter(Boolean) ?? [];

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // Reset to first page when filters change
    params.delete("page");

    router.push(`/${slug}/admin/guests?${params.toString()}`);
  }

  function toggleMultiFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key)?.split(",").filter(Boolean) ?? [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    if (updated.length === 0) {
      params.delete(key);
    } else {
      params.set(key, updated.join(","));
    }
    params.delete("page");
    router.push(`/${slug}/admin/guests?${params.toString()}`);
  }

  function toggleEventFilter(eventId: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("events")?.split(",").filter(Boolean) ?? [];
    const updated = current.includes(eventId)
      ? current.filter((id) => id !== eventId)
      : [...current, eventId];

    if (updated.length === 0) {
      params.delete("events");
    } else {
      params.set("events", updated.join(","));
    }
    params.delete("page");
    router.push(`/${slug}/admin/guests?${params.toString()}`);
  }

  function clearAllFilters() {
    router.push(`/${slug}/admin/guests`);
    setOpen(false);
  }

  const hasActiveFilters =
    currentSide ||
    currentStatuses.length > 0 ||
    currentList ||
    currentFamily ||
    currentUnder21 ||
    currentThreeAndUnder ||
    currentIsPlusOne ||
    currentEmailStatus ||
    currentBridalParty ||
    currentEvents.length > 0;
  const filterCount =
    [
      currentSide,
      currentList,
      currentFamily,
      currentUnder21,
      currentThreeAndUnder,
      currentIsPlusOne,
      currentEmailStatus,
      currentBridalParty,
    ].filter(Boolean).length +
    (currentStatuses.length > 0 ? 1 : 0) +
    (currentEvents.length > 0 ? 1 : 0);

  return (
    <div className="flex items-center gap-2 mb-4 min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="relative flex-shrink-0 h-9 w-9 p-0 md:w-auto md:px-3 md:gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 md:static md:ml-1 rounded-full bg-primary px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs text-primary-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 max-h-[80vh] overflow-y-auto"
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Filter Guests</h4>
              <p className="text-sm text-muted-foreground">
                Filter guests by various criteria
              </p>
            </div>

            {/* Side Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Side</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentSide === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("side", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentSide === "bride" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("side", "bride")}
                  className="w-full"
                >
                  Bride
                </Button>
                <Button
                  variant={currentSide === "groom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("side", "groom")}
                  className="w-full"
                >
                  Groom
                </Button>
              </div>
            </div>

            {/* RSVP Status Filter (multi-select) */}
            <div className="space-y-2">
              <span className="text-sm font-medium">RSVP Status</span>
              <div className="space-y-1.5">
                {[
                  { value: "pending", label: "Pending" },
                  { value: "yes", label: "Confirmed" },
                  { value: "no", label: "Declined" },
                ].map((option) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox handles focus internally
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={currentStatuses.includes(option.value)}
                      onCheckedChange={() =>
                        toggleMultiFilter("rsvpStatus", option.value)
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {/* List Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">List</span>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={currentList === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("list", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentList === "a" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("list", "a")}
                  className="w-full"
                >
                  A
                </Button>
                <Button
                  variant={currentList === "b" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("list", "b")}
                  className="w-full"
                >
                  B
                </Button>
                <Button
                  variant={currentList === "c" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("list", "c")}
                  className="w-full"
                >
                  C
                </Button>
              </div>
            </div>

            {/* Family Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Family Member</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentFamily === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("family", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentFamily === "true" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("family", "true")}
                  className="w-full"
                >
                  Yes
                </Button>
                <Button
                  variant={currentFamily === "false" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("family", "false")}
                  className="w-full"
                >
                  No
                </Button>
              </div>
            </div>

            {/* Under 21 Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Under 21</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentUnder21 === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("under21", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentUnder21 === "true" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("under21", "true")}
                  className="w-full"
                >
                  Yes
                </Button>
                <Button
                  variant={currentUnder21 === "false" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("under21", "false")}
                  className="w-full"
                >
                  No
                </Button>
              </div>
            </div>

            {/* 3 and Under Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">3 and Under</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={
                    currentThreeAndUnder === null ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("threeAndUnder", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={
                    currentThreeAndUnder === "true" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("threeAndUnder", "true")}
                  className="w-full"
                >
                  Yes
                </Button>
                <Button
                  variant={
                    currentThreeAndUnder === "false" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("threeAndUnder", "false")}
                  className="w-full"
                >
                  No
                </Button>
              </div>
            </div>

            {/* Plus One Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Guest Type</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentIsPlusOne === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("isPlusOne", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentIsPlusOne === "false" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("isPlusOne", "false")}
                  className="w-full"
                >
                  Primary
                </Button>
                <Button
                  variant={currentIsPlusOne === "true" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("isPlusOne", "true")}
                  className="w-full"
                >
                  Plus One
                </Button>
              </div>
            </div>

            {/* Email Status Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Email Status</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentEmailStatus === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("emailStatus", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={
                    currentEmailStatus === "not_sent" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("emailStatus", "not_sent")}
                  className="w-full"
                >
                  Not Sent
                </Button>
                <Button
                  variant={
                    currentEmailStatus === "sent" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("emailStatus", "sent")}
                  className="w-full"
                >
                  Sent
                </Button>
                <Button
                  variant={
                    currentEmailStatus === "resent" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("emailStatus", "resent")}
                  className="w-full"
                >
                  Resent
                </Button>
              </div>
            </div>

            {/* Bridal Party Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Bridal Party</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentBridalParty === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("bridalParty", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentBridalParty === "any" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("bridalParty", "any")}
                  className="w-full"
                >
                  Any Role
                </Button>
                <Button
                  variant={
                    currentBridalParty === "best_man" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("bridalParty", "best_man")}
                  className="w-full"
                >
                  Best Man
                </Button>
                <Button
                  variant={
                    currentBridalParty === "groomsman" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("bridalParty", "groomsman")}
                  className="w-full"
                >
                  Groomsman
                </Button>
                <Button
                  variant={
                    currentBridalParty === "maid_of_honor"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("bridalParty", "maid_of_honor")}
                  className="w-full"
                >
                  Maid of Honor
                </Button>
                <Button
                  variant={
                    currentBridalParty === "bridesmaid" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("bridalParty", "bridesmaid")}
                  className="w-full"
                >
                  Bridesmaid
                </Button>
              </div>
            </div>

            {/* Event Filter */}
            {events.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Invited To Event</span>
                <div className="space-y-1.5">
                  {events.map((event) => (
                    // biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox handles focus internally
                    <label
                      key={event.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={currentEvents.includes(event.id)}
                        onCheckedChange={() => toggleEventFilter(event.id)}
                      />
                      {event.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 overflow-x-auto">
          <span className="flex-shrink-0 hidden sm:inline">Active:</span>
          {currentSide && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {currentSide === "bride" ? "Bride" : "Groom"}
              <button
                type="button"
                onClick={() => updateFilter("side", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentStatuses.length > 0 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              RSVP:{" "}
              {currentStatuses
                .map((s) =>
                  s === "pending"
                    ? "Pending"
                    : s === "yes"
                      ? "Confirmed"
                      : "Declined",
                )
                .join(", ")}
              <button
                type="button"
                onClick={() => updateFilter("rsvpStatus", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentList && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              List: {currentList.toUpperCase()}
              <button
                type="button"
                onClick={() => updateFilter("list", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentFamily && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Family: {currentFamily === "true" ? "Yes" : "No"}
              <button
                type="button"
                onClick={() => updateFilter("family", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentUnder21 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Under 21: {currentUnder21 === "true" ? "Yes" : "No"}
              <button
                type="button"
                onClick={() => updateFilter("under21", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentThreeAndUnder && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              3 and Under: {currentThreeAndUnder === "true" ? "Yes" : "No"}
              <button
                type="button"
                onClick={() => updateFilter("threeAndUnder", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentIsPlusOne && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {currentIsPlusOne === "true" ? "Plus One" : "Primary Guest"}
              <button
                type="button"
                onClick={() => updateFilter("isPlusOne", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentEmailStatus && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Email:{" "}
              {currentEmailStatus === "not_sent"
                ? "Not Sent"
                : currentEmailStatus === "sent"
                  ? "Sent"
                  : "Resent"}
              <button
                type="button"
                onClick={() => updateFilter("emailStatus", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentEvents.length > 0 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Events: {currentEvents.length}
              <button
                type="button"
                onClick={() => updateFilter("events", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentBridalParty && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {currentBridalParty === "any"
                ? "Bridal Party"
                : currentBridalParty === "best_man"
                  ? "Best Man"
                  : currentBridalParty === "groomsman"
                    ? "Groomsman"
                    : currentBridalParty === "maid_of_honor"
                      ? "Maid of Honor"
                      : "Bridesmaid"}
              <button
                type="button"
                onClick={() => updateFilter("bridalParty", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
