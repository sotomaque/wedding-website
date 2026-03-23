"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Filter, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface InvitesFiltersProps {
  eventId: string;
}

type BridalPartyValue =
  | "groomsman"
  | "best_man"
  | "bridesmaid"
  | "maid_of_honor"
  | "any";
type RsvpValue = "yes" | "pending" | "no";

const BRIDAL_PARTY_LABELS: Record<BridalPartyValue, string> = {
  any: "Any Role",
  best_man: "Best Man",
  groomsman: "Groomsman",
  maid_of_honor: "Maid of Honor",
  bridesmaid: "Bridesmaid",
};

const RSVP_LABELS: Record<RsvpValue, string> = {
  yes: "Confirmed",
  pending: "Pending",
  no: "Declined",
};

export function InvitesFilters({ eventId }: InvitesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Single-select filters
  const currentSide = searchParams.get("side") as "bride" | "groom" | null;
  const currentFamily = searchParams.get("family") as "true" | "false" | null;
  const currentEventInvited = searchParams.get("eventInvited") as
    | "true"
    | "false"
    | null;
  const currentEmailSent = searchParams.get("emailSent") as
    | "true"
    | "false"
    | null;

  // Multi-select filters (comma-separated in URL)
  const currentBridalParty = searchParams.get("bridalParty");
  const bridalPartyValues = currentBridalParty
    ? (currentBridalParty.split(",") as BridalPartyValue[])
    : [];

  const currentWeddingRsvp = searchParams.get("weddingRsvp");
  const weddingRsvpValues = currentWeddingRsvp
    ? (currentWeddingRsvp.split(",") as RsvpValue[])
    : [];

  const currentEventRsvp = searchParams.get("eventRsvp");
  const eventRsvpValues = currentEventRsvp
    ? (currentEventRsvp.split(",") as RsvpValue[])
    : [];

  const basePath = `/admin/events/${eventId}/invites`;

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // Reset to first page when filters change
    params.delete("page");

    router.push(`${basePath}?${params.toString()}`);
  }

  // Toggle a value in a multi-select filter
  function toggleMultiFilter(
    key: string,
    value: string,
    currentValues: string[],
  ) {
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    updateFilter(key, newValues.length > 0 ? newValues.join(",") : null);
  }

  function clearAllFilters() {
    router.push(basePath);
    setOpen(false);
  }

  const hasActiveFilters =
    currentSide ||
    currentFamily ||
    bridalPartyValues.length > 0 ||
    weddingRsvpValues.length > 0 ||
    currentEventInvited ||
    currentEmailSent ||
    eventRsvpValues.length > 0;

  const filterCount = [
    currentSide,
    currentFamily,
    bridalPartyValues.length > 0,
    weddingRsvpValues.length > 0,
    currentEventInvited,
    currentEmailSent,
    eventRsvpValues.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 min-w-0">
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
          align="start"
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

            {/* Bridal Party Filter (Multi-select) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bridal Party</span>
                {bridalPartyValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateFilter("bridalParty", null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select multiple roles
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  Object.entries(BRIDAL_PARTY_LABELS) as [
                    BridalPartyValue,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={
                      bridalPartyValues.includes(value) ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      toggleMultiFilter("bridalParty", value, bridalPartyValues)
                    }
                    className="w-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Wedding RSVP Filter (Multi-select) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wedding RSVP</span>
                {weddingRsvpValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateFilter("weddingRsvp", null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select multiple statuses
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(RSVP_LABELS) as [RsvpValue, string][]).map(
                  ([value, label]) => (
                    <Button
                      key={value}
                      variant={
                        weddingRsvpValues.includes(value)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        toggleMultiFilter(
                          "weddingRsvp",
                          value,
                          weddingRsvpValues,
                        )
                      }
                      className="w-full"
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>

            {/* Event Invited Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Event Invited</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentEventInvited === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("eventInvited", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={
                    currentEventInvited === "true" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("eventInvited", "true")}
                  className="w-full"
                >
                  Invited
                </Button>
                <Button
                  variant={
                    currentEventInvited === "false" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("eventInvited", "false")}
                  className="w-full"
                >
                  Not Invited
                </Button>
              </div>
            </div>

            {/* Email Sent Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Email Sent</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentEmailSent === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("emailSent", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentEmailSent === "true" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("emailSent", "true")}
                  className="w-full"
                >
                  Sent
                </Button>
                <Button
                  variant={currentEmailSent === "false" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("emailSent", "false")}
                  className="w-full"
                >
                  Not Sent
                </Button>
              </div>
            </div>

            {/* Event RSVP Filter (Multi-select) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Event RSVP</span>
                {eventRsvpValues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateFilter("eventRsvp", null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Select multiple statuses
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(RSVP_LABELS) as [RsvpValue, string][]).map(
                  ([value, label]) => (
                    <Button
                      key={value}
                      variant={
                        eventRsvpValues.includes(value) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        toggleMultiFilter("eventRsvp", value, eventRsvpValues)
                      }
                      className="w-full"
                    >
                      {label}
                    </Button>
                  ),
                )}
              </div>
            </div>

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
          {bridalPartyValues.length > 0 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {bridalPartyValues.length === 1
                ? BRIDAL_PARTY_LABELS[bridalPartyValues[0] as BridalPartyValue]
                : `${bridalPartyValues.length} roles`}
              <button
                type="button"
                onClick={() => updateFilter("bridalParty", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {weddingRsvpValues.length > 0 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Wedding:{" "}
              {weddingRsvpValues.length === 1
                ? RSVP_LABELS[weddingRsvpValues[0] as RsvpValue]
                : `${weddingRsvpValues.length} statuses`}
              <button
                type="button"
                onClick={() => updateFilter("weddingRsvp", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentEventInvited && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {currentEventInvited === "true" ? "Invited" : "Not Invited"}
              <button
                type="button"
                onClick={() => updateFilter("eventInvited", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentEmailSent && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Email: {currentEmailSent === "true" ? "Sent" : "Not Sent"}
              <button
                type="button"
                onClick={() => updateFilter("emailSent", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {eventRsvpValues.length > 0 && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Event:{" "}
              {eventRsvpValues.length === 1
                ? RSVP_LABELS[eventRsvpValues[0] as RsvpValue]
                : `${eventRsvpValues.length} statuses`}
              <button
                type="button"
                onClick={() => updateFilter("eventRsvp", null)}
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
