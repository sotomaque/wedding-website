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
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";

export function GiftsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();
  const [open, setOpen] = useState(false);

  const currentGiftType = searchParams.get("giftType") as
    | "baby_fund"
    | "honeymoon"
    | "student_loans"
    | null;
  const currentStatus = searchParams.get("status") as
    | "pending"
    | "completed"
    | "refunded"
    | "failed"
    | null;
  const currentThankYouSent = searchParams.get("thankYouSent") as
    | "true"
    | "false"
    | null;
  const currentHasGuest = searchParams.get("hasGuest") as
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

    router.push(`/${slug}/admin/gifts?${params.toString()}`);
  }

  function clearAllFilters() {
    router.push(`/${slug}/admin/gifts`);
    setOpen(false);
  }

  const hasActiveFilters =
    currentGiftType || currentStatus || currentThankYouSent || currentHasGuest;
  const filterCount = [
    currentGiftType,
    currentStatus,
    currentThankYouSent,
    currentHasGuest,
  ].filter(Boolean).length;

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
          align="end"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Filter Gifts</h4>
              <p className="text-sm text-muted-foreground">
                Filter gifts by various criteria
              </p>
            </div>

            {/* Gift Type Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Fund Type</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentGiftType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("giftType", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={
                    currentGiftType === "baby_fund" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("giftType", "baby_fund")}
                  className="w-full"
                >
                  Baby Fund
                </Button>
                <Button
                  variant={
                    currentGiftType === "honeymoon" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("giftType", "honeymoon")}
                  className="w-full"
                >
                  Honeymoon
                </Button>
                <Button
                  variant={
                    currentGiftType === "student_loans" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("giftType", "student_loans")}
                  className="w-full"
                >
                  Student Loans
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Status</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentStatus === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("status", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={
                    currentStatus === "completed" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("status", "completed")}
                  className="w-full"
                >
                  Completed
                </Button>
                <Button
                  variant={currentStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("status", "pending")}
                  className="w-full"
                >
                  Pending
                </Button>
                <Button
                  variant={currentStatus === "refunded" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("status", "refunded")}
                  className="w-full"
                >
                  Refunded
                </Button>
                <Button
                  variant={currentStatus === "failed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("status", "failed")}
                  className="w-full col-span-2"
                >
                  Failed
                </Button>
              </div>
            </div>

            {/* Thank You Sent Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Thank You Email</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentThankYouSent === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("thankYouSent", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={
                    currentThankYouSent === "true" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("thankYouSent", "true")}
                  className="w-full"
                >
                  Sent
                </Button>
                <Button
                  variant={
                    currentThankYouSent === "false" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateFilter("thankYouSent", "false")}
                  className="w-full"
                >
                  Not Sent
                </Button>
              </div>
            </div>

            {/* Matched Guest Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Matched to Guest</span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentHasGuest === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("hasGuest", null)}
                  className="w-full"
                >
                  All
                </Button>
                <Button
                  variant={currentHasGuest === "true" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("hasGuest", "true")}
                  className="w-full"
                >
                  Yes
                </Button>
                <Button
                  variant={currentHasGuest === "false" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("hasGuest", "false")}
                  className="w-full"
                >
                  No
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 overflow-x-auto">
          <span className="flex-shrink-0 hidden sm:inline">Active:</span>
          {currentGiftType && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              {currentGiftType === "baby_fund"
                ? "Baby Fund"
                : currentGiftType === "honeymoon"
                  ? "Honeymoon"
                  : "Student Loans"}
              <button
                type="button"
                onClick={() => updateFilter("giftType", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentStatus && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium capitalize">
              {currentStatus}
              <button
                type="button"
                onClick={() => updateFilter("status", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentThankYouSent && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Thank You: {currentThankYouSent === "true" ? "Sent" : "Not Sent"}
              <button
                type="button"
                onClick={() => updateFilter("thankYouSent", null)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {currentHasGuest && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Guest Match: {currentHasGuest === "true" ? "Yes" : "No"}
              <button
                type="button"
                onClick={() => updateFilter("hasGuest", null)}
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
