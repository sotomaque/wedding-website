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
        guestName: `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`,
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
        guest.isPlusOne && "italic",
        guest.family && "font-medium",
        guest.bridalPartyRole && "bg-accent/20",
      )}
    >
      <div className="flex items-center gap-1">
        <span className="truncate">
          {guest.firstName}
          {guest.lastName ? ` ${guest.lastName}` : ""}
        </span>
        {guest.bridalPartyRole && (
          <span className="text-xs text-muted-foreground">
            ({guest.bridalPartyRole.replace("_", " ")})
          </span>
        )}
      </div>
    </div>
  );
}
