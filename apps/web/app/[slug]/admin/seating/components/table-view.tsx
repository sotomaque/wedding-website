"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Pencil, Trash2, X } from "lucide-react";
import type {
  SeatingChartWithTables,
  SeatingTableWithGuests,
} from "@/lib/types/seating";

interface TableViewProps {
  chart: SeatingChartWithTables;
  onAssignGuest: (guestId: string, tableId: string) => Promise<void>;
  onUnassignGuest: (guestId: string, tableId: string) => Promise<void>;
  onEditTable: (table: SeatingTableWithGuests) => void;
  onDeleteTable: (tableId: string) => Promise<void>;
}

export function TableView({
  chart,
  onAssignGuest,
  onUnassignGuest,
  onEditTable,
  onDeleteTable,
}: TableViewProps) {
  const handleAssign = async (guestId: string, tableId: string) => {
    if (guestId && tableId) {
      await onAssignGuest(guestId, tableId);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Unassigned Guests Panel */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Unassigned Guests</h3>
          <Badge variant="secondary">{chart.unassignedGuests.length}</Badge>
        </div>

        {chart.unassignedGuests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            All guests have been assigned to tables.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-auto">
            {chart.unassignedGuests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center justify-between gap-2 p-2 border rounded hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {guest.firstName}
                    {guest.lastName ? ` ${guest.lastName}` : ""}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {guest.side && (
                      <span className="capitalize">{guest.side}</span>
                    )}
                    {guest.family && <span>• Family</span>}
                    {guest.bridalPartyRole && (
                      <span>• {guest.bridalPartyRole.replace("_", " ")}</span>
                    )}
                  </div>
                </div>
                <Select
                  onValueChange={(tableId) => handleAssign(guest.id, tableId)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {chart.tables.map((table) => (
                      <SelectItem
                        key={table.id}
                        value={table.id}
                        disabled={table.assignedCount >= table.capacity}
                      >
                        {table.tableName || `Table ${table.tableNumber}`}
                        {table.assignedCount >= table.capacity && " (Full)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tables Panel */}
      <div className="space-y-4 max-h-[600px] overflow-auto">
        {chart.tables.map((table) => (
          <div key={table.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">
                  {table.tableName || `Table ${table.tableNumber}`}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {table.assignedCount} of {table.capacity} seats filled
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    table.assignedCount >= table.capacity
                      ? "default"
                      : "secondary"
                  }
                  className={
                    table.assignedCount >= table.capacity ? "bg-amber-500" : ""
                  }
                >
                  {table.assignedCount}/{table.capacity}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEditTable(table)}
                  title="Edit table"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onDeleteTable(table.id)}
                  title="Delete table"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>

            {/* Capacity bar */}
            <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  table.assignedCount >= table.capacity
                    ? "bg-amber-500"
                    : "bg-accent"
                }`}
                style={{
                  width: `${Math.min(100, (table.assignedCount / table.capacity) * 100)}%`,
                }}
              />
            </div>

            {/* Assigned guests */}
            {table.guests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border-t">
                No guests assigned yet
              </p>
            ) : (
              <div className="space-y-1 border-t pt-3">
                {table.guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {guest.side && (
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            guest.side === "bride"
                              ? "bg-pink-400"
                              : guest.side === "groom"
                                ? "bg-blue-400"
                                : "bg-purple-400"
                          }`}
                        />
                      )}
                      <span className="text-sm truncate">
                        {guest.firstName}
                        {guest.lastName ? ` ${guest.lastName}` : ""}
                      </span>
                      {guest.bridalPartyRole && (
                        <span className="text-xs text-muted-foreground">
                          ({guest.bridalPartyRole.replace("_", " ")})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onUnassignGuest(guest.id, table.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
