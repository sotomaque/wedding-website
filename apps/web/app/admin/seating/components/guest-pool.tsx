"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@workspace/ui/components/badge";
import { Users } from "lucide-react";
import type { Guest } from "@/lib/types/seating";
import { GuestChip } from "./guest-chip";

interface GuestPoolProps {
  guests: Guest[];
}

export function GuestPool({ guests }: GuestPoolProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-pool",
  });

  // Group guests by invite code for visual grouping
  const groupedGuests = guests.reduce(
    (acc, guest) => {
      const code = guest.invite_code;
      if (!acc[code]) {
        acc[code] = [];
      }
      acc[code].push(guest);
      return acc;
    },
    {} as Record<string, Guest[]>,
  );

  return (
    <div
      ref={setNodeRef}
      className={`w-64 shrink-0 border rounded-lg p-3 overflow-auto transition-colors ${
        isOver ? "border-accent bg-accent/10" : "bg-background"
      }`}
    >
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-background pb-2 border-b">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Unassigned</span>
        </div>
        <Badge variant="secondary">{guests.length}</Badge>
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          All guests have been assigned!
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
