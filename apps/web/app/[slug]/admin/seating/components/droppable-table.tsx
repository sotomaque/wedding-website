"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Trash2 } from "lucide-react";
import type { SeatingTableWithGuests } from "@/lib/types/seating";
import { GuestChip } from "./guest-chip";

interface DroppableTableProps {
  table: SeatingTableWithGuests;
  onDeleteTable: (tableId: string) => Promise<void>;
}

export function DroppableTable({ table, onDeleteTable }: DroppableTableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `table-${table.id}`,
  });

  const isFull = table.assignedCount >= table.capacity;
  const fillPercentage = Math.min(
    100,
    (table.assignedCount / table.capacity) * 100,
  );

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg p-3 bg-background transition-all ${
        isOver && !isFull
          ? "border-accent ring-2 ring-accent/20"
          : isFull
            ? "border-amber-400"
            : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">
            {table.table_name || `Table ${table.table_number}`}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant={isFull ? "default" : "secondary"}
              className={isFull ? "bg-amber-500" : ""}
            >
              {table.assignedCount}/{table.capacity}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onDeleteTable(table.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      {/* Capacity bar */}
      <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full transition-all ${
            isFull ? "bg-amber-500" : "bg-accent"
          }`}
          style={{ width: `${fillPercentage}%` }}
        />
      </div>

      {/* Guests */}
      <div className="space-y-1 min-h-[60px]">
        {table.guests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Drag guests here
          </p>
        ) : (
          table.guests.map((guest) => (
            <GuestChip key={guest.id} guest={guest} sourceTableId={table.id} />
          ))
        )}
      </div>
    </div>
  );
}
