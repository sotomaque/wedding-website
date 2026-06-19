"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { Guest } from "@/lib/types/seating";
import { GuestChip } from "./guest-chip";

type SideFilter = "all" | "bride" | "groom" | "both";

interface GuestPoolProps {
  guests: Guest[];
}

export function GuestPool({ guests }: GuestPoolProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-pool",
  });
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");

  // Search by name + filter by side (client-side; the pool is already the
  // scoped list of unassigned guests). Exact side match so "Both" is its own
  // selectable bucket, matching the guest-list side filter semantics.
  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests.filter((guest) => {
      if (sideFilter !== "all" && guest.side !== sideFilter) return false;
      if (!query) return true;
      const name = `${guest.firstName} ${guest.lastName ?? ""}`.toLowerCase();
      return name.includes(query);
    });
  }, [guests, search, sideFilter]);

  // Group filtered guests by invite code for visual grouping
  const groupedGuests = filteredGuests.reduce(
    (acc, guest) => {
      const code = guest.inviteCode ?? guest.id;
      if (!acc[code]) {
        acc[code] = [];
      }
      acc[code].push(guest);
      return acc;
    },
    {} as Record<string, Guest[]>,
  );

  const isFiltered = search.trim() !== "" || sideFilter !== "all";

  return (
    <div
      ref={setNodeRef}
      className={`w-full lg:w-64 lg:shrink-0 max-h-72 lg:max-h-none border rounded-lg p-3 overflow-auto transition-colors ${
        isOver ? "border-accent bg-accent/10" : "bg-background"
      }`}
    >
      <div className="sticky top-0 bg-background pb-2 mb-3 border-b space-y-2 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Unassigned</span>
          </div>
          <Badge variant="secondary">
            {isFiltered
              ? `${filteredGuests.length}/${guests.length}`
              : guests.length}
          </Badge>
        </div>
        <Input
          placeholder="Search guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <Select
          value={sideFilter}
          onValueChange={(value) => setSideFilter(value as SideFilter)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sides</SelectItem>
            <SelectItem value="bride">Bride's side</SelectItem>
            <SelectItem value="groom">Groom's side</SelectItem>
            <SelectItem value="both">Both sides</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          All guests have been assigned!
        </p>
      ) : filteredGuests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No unassigned guests match your filters.
        </p>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedGuests).map(([inviteCode, groupGuests]) => (
            <div key={inviteCode} className="space-y-1">
              {groupGuests.length > 1 && (
                <div className="text-xs text-muted-foreground px-1">
                  Group ({groupGuests.length})
                </div>
              )}
              {groupGuests.map((guest) => (
                <GuestChip key={guest.id} guest={guest} sourceTableId={null} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
