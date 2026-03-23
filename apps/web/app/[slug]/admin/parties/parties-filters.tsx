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

export function PartiesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();
  const [open, setOpen] = useState(false);

  const currentSide = searchParams.get("side") as
    | "bride"
    | "groom"
    | "both"
    | null;
  const currentList = searchParams.get("list") as "a" | "b" | "c" | null;

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`/${slug}/admin/parties?${params.toString()}`);
  }

  function clearAllFilters() {
    router.push(`/${slug}/admin/parties`);
    setOpen(false);
  }

  const hasActiveFilters = currentSide || currentList;
  const filterCount = [currentSide, currentList].filter(Boolean).length;

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
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Filter Parties</h4>
              <p className="text-sm text-muted-foreground">
                Filter parties by various criteria
              </p>
            </div>

            {/* Side Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Side</span>
              <div className="grid grid-cols-2 gap-2">
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
                <Button
                  variant={currentSide === "both" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("side", "both")}
                  className="w-full"
                >
                  Both
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
              {currentSide === "bride"
                ? "Bride"
                : currentSide === "groom"
                  ? "Groom"
                  : "Both"}
              <button
                type="button"
                onClick={() => updateFilter("side", null)}
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
        </div>
      )}
    </div>
  );
}
