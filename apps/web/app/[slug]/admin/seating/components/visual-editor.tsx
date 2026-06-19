"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import type { SeatingChartWithTables } from "@/lib/types/seating";
import { DroppableTable } from "./droppable-table";
import { GuestPool } from "./guest-pool";

interface VisualEditorProps {
  chart: SeatingChartWithTables;
  onAssignGuest: (guestId: string, tableId: string) => Promise<void>;
  onUnassignGuest: (guestId: string, tableId: string) => Promise<void>;
  onMoveGuest: (
    guestId: string,
    fromTableId: string,
    toTableId: string,
  ) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
}

interface DragData {
  guestId: string;
  guestName: string;
  sourceTableId: string | null;
}

export function VisualEditor({
  chart,
  onAssignGuest,
  onUnassignGuest,
  onMoveGuest,
  onDeleteTable,
}: VisualEditorProps) {
  const [activeGuest, setActiveGuest] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragData;
    setActiveGuest(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveGuest(null);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropId = over.id as string;

    // Dropping on unassigned pool
    if (dropId === "unassigned-pool") {
      if (dragData.sourceTableId) {
        await onUnassignGuest(dragData.guestId, dragData.sourceTableId);
      }
      return;
    }

    // Dropping on a table
    if (dropId.startsWith("table-")) {
      const targetTableId = dropId.replace("table-", "");

      if (dragData.sourceTableId === null) {
        // From unassigned to table
        await onAssignGuest(dragData.guestId, targetTableId);
      } else if (dragData.sourceTableId !== targetTableId) {
        // From one table to another
        await onMoveGuest(
          dragData.guestId,
          dragData.sourceTableId,
          targetTableId,
        );
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:h-[calc(100vh-220px)] lg:min-h-[500px]">
        {/* Guest Pool - Unassigned guests */}
        <GuestPool guests={chart.unassignedGuests} />

        {/* Tables Grid */}
        <div className="flex-1 overflow-auto border rounded-lg bg-muted/30 p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {chart.tables.map((table) => (
              <DroppableTable
                key={table.id}
                table={table}
                onDeleteTable={onDeleteTable}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeGuest && (
          <div className="px-3 py-2 bg-accent text-accent-foreground rounded-md shadow-lg text-sm font-medium cursor-grabbing">
            {activeGuest.guestName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
