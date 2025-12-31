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

export function GuestsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const currentSide = searchParams.get("side") as "bride" | "groom" | null;
  const currentStatus = searchParams.get("rsvpStatus") as
    | "pending"
    | "yes"
    | "no"
    | null;
  const currentList = searchParams.get("list") as "a" | "b" | "c" | null;
  const currentFamily = searchParams.get("family") as "true" | "false" | null;
  const currentIsPlusOne = searchParams.get("isPlusOne") as
    | "true"
    | "false"
    | null;

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // Reset to first page when filters change
    params.delete("page");

    router.push(`/admin/guests?${params.toString()}`);
  }

  function clearAllFilters() {
    router.push("/admin/guests");
    setOpen(false);
  }

  const hasActiveFilters =
    currentSide ||
    currentStatus ||
    currentList ||
    currentFamily ||
    currentIsPlusOne;
  const filterCount = [
    currentSide,
    currentStatus,
    currentList,
    currentFamily,
    currentIsPlusOne,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 mb-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {filterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
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

            {/* RSVP Status Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">RSVP Status</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentStatus === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("rsvpStatus", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("rsvpStatus", "pending")}
                  className="w-full"
                >
                  Pending
                </Button>
                <Button
                  variant={currentStatus === "yes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("rsvpStatus", "yes")}
                  className="w-full"
                >
                  Confirmed
                </Button>
                <Button
                  variant={currentStatus === "no" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("rsvpStatus", "no")}
                  className="w-full"
                >
                  Declined
                </Button>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active:</span>
          {currentSide && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
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
          {currentStatus && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {currentStatus === "pending"
                ? "Pending"
                : currentStatus === "yes"
                  ? "Confirmed"
                  : "Declined"}
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
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
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
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
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
          {currentIsPlusOne && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
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
        </div>
      )}
    </div>
  );
}
