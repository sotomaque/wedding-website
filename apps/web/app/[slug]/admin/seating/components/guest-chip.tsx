"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@workspace/ui/lib/utils";
import type { Guest } from "@/lib/types/seating";

interface GuestChipProps {
  guest: Guest;
  sourceTableId: string | null;
}

export function GuestChip({ guest, sourceTableId }: GuestChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `guest-${guest.id}`,
      data: {
        guestId: guest.id,
        guestName: `${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""}`,
        sourceTableId,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const sideColors: Record<string, string> = {
    bride: "border-l-pink-400",
    groom: "border-l-blue-400",
    both: "border-l-purple-400",
  };

  const sideColor = guest.side ? sideColors[guest.side] : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "px-2 py-1.5 bg-background border rounded text-sm cursor-grab active:cursor-grabbing transition-colors hover:bg-muted",
        sideColor && `border-l-4 ${sideColor}`,
        isDragging && "opacity-50",
        guest.is_plus_one && "italic",
        guest.family && "font-medium",
        guest.bridal_party_role && "bg-accent/20",
      )}
    >
      <div className="flex items-center gap-1">
        <span className="truncate">
          {guest.first_name}
          {guest.last_name ? ` ${guest.last_name}` : ""}
        </span>
        {guest.bridal_party_role && (
          <span className="text-xs text-muted-foreground">
            ({guest.bridal_party_role.replace("_", " ")})
          </span>
        )}
      </div>
    </div>
  );
}
