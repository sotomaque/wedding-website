"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ArrowLeft,
  Filter,
  LayoutGrid,
  List,
  MessageSquarePlus,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type {
  GuestFilter,
  GuestListFilter,
  GuestRsvpFilter,
  SeatingChartWithTables,
} from "@/lib/types/seating";
import {
  GUEST_LIST_FILTER_OPTIONS,
  GUEST_RSVP_FILTER_OPTIONS,
} from "@/lib/types/seating";
import { TableView } from "../components/table-view";
import { VisualEditor } from "../components/visual-editor";

interface ChartEditorProps {
  chart: SeatingChartWithTables;
  filter: GuestFilter & { eventId?: string };
  events: Array<{ id: string; name: string }>;
}

type ViewMode = "visual" | "table";

export function ChartEditor({ chart, filter, events }: ChartEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState<number | null>(null);
  const [pendingDeleteTableId, setPendingDeleteTableId] = useState<
    string | null
  >(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);

  const handleFilterChange = (list: GuestListFilter, rsvp: GuestRsvpFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("list", list);
    params.set("rsvp", rsvp);
    startTransition(() => {
      router.push(`/${slug}/admin/seating/${chart.id}?${params.toString()}`);
    });
  };

  const handleEventFilterChange = (eventId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (eventId === "all") {
      params.delete("event");
    } else {
      params.set("event", eventId);
    }
    startTransition(() => {
      router.push(`/${slug}/admin/seating/${chart.id}?${params.toString()}`);
    });
  };

  const refreshData = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleAddTable = async () => {
    try {
      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/tables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableName: newTableName.trim() || null,
            capacityOverride: newTableCapacity,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to add table");
      }

      setIsAddTableDialogOpen(false);
      setNewTableName("");
      setNewTableCapacity(null);
      toast.success("Table added");
      refreshData();
    } catch (error) {
      console.error("Error adding table:", error);
      toast.error("Failed to add table");
    }
  };

  const executeDeleteTable = async (tableId: string) => {
    try {
      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/tables/${tableId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete table");
      }

      toast.success("Table deleted");
      refreshData();
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Failed to delete table");
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    const table = chart.tables.find((t) => t.id === tableId);
    if (!table) return;

    if (table.guests.length > 0) {
      setPendingDeleteTableId(tableId);
      return;
    }

    await executeDeleteTable(tableId);
  };

  // Helper to find all party members (same partyId or inviteCode) for a guest
  const getPartyMembers = (guestId: string) => {
    // Get all guests from all sources
    const allGuests = [
      ...chart.unassignedGuests,
      ...chart.tables.flatMap((t) => t.guests),
    ];

    // Find the target guest
    const targetGuest = allGuests.find((g) => g.id === guestId);
    if (!targetGuest) return [];

    // Use partyId if available, otherwise fall back to inviteCode
    if (targetGuest.partyId) {
      return allGuests.filter((g) => g.partyId === targetGuest.partyId);
    }

    // Fallback to inviteCode for backwards compatibility
    return allGuests.filter((g) => g.inviteCode === targetGuest.inviteCode);
  };

  const handleAssignGuest = async (guestId: string, tableId: string) => {
    const table = chart.tables.find((t) => t.id === tableId);
    if (!table) return;

    // Get all party members
    const partyMembers = getPartyMembers(guestId);
    const partySize = partyMembers.length;

    // Filter to only unassigned party members (some might already be at other tables)
    const unassignedPartyMembers = partyMembers.filter((g) =>
      chart.unassignedGuests.some((ug) => ug.id === g.id),
    );

    // Check capacity for entire party
    const availableSeats = table.capacity - table.assignedCount;
    if (unassignedPartyMembers.length > availableSeats) {
      toast.error(
        `Not enough seats! Party of ${partySize} needs ${unassignedPartyMembers.length} seats, but only ${availableSeats} available.`,
      );
      return;
    }

    try {
      // Assign all unassigned party members
      const assignments = unassignedPartyMembers.map((g) => ({
        guestId: g.id,
        tableId,
      }));

      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to assign guests");
      }

      if (unassignedPartyMembers.length > 1) {
        toast.success(
          `Assigned ${unassignedPartyMembers.length} party members`,
        );
      }
      refreshData();
    } catch (error) {
      console.error("Error assigning guest:", error);
      toast.error("Failed to assign guest");
    }
  };

  const handleUnassignGuest = async (guestId: string, _tableId: string) => {
    // Get all party members
    const partyMembers = getPartyMembers(guestId);

    // Filter to only assigned party members
    const assignedPartyMembers = partyMembers.filter((g) =>
      chart.tables.some((t) => t.guests.some((tg) => tg.id === g.id)),
    );

    try {
      const guestIds = assignedPartyMembers.map((g) => g.id).join(",");
      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/assignments?guestIds=${guestIds}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to unassign guests");
      }

      if (assignedPartyMembers.length > 1) {
        toast.success(
          `Unassigned ${assignedPartyMembers.length} party members`,
        );
      }
      refreshData();
    } catch (error) {
      console.error("Error unassigning guest:", error);
      toast.error("Failed to unassign guest");
    }
  };

  const handleMoveGuest = async (
    guestId: string,
    fromTableId: string,
    toTableId: string,
  ) => {
    const toTable = chart.tables.find((t) => t.id === toTableId);
    if (!toTable) return;

    // Get all party members
    const partyMembers = getPartyMembers(guestId);

    // Find party members that are currently at the source table
    const fromTable = chart.tables.find((t) => t.id === fromTableId);
    const partyMembersToMove = partyMembers.filter((g) =>
      fromTable?.guests.some((tg) => tg.id === g.id),
    );

    // Check capacity for the party members being moved
    const availableSeats = toTable.capacity - toTable.assignedCount;
    if (partyMembersToMove.length > availableSeats) {
      toast.error(
        `Not enough seats! Party of ${partyMembersToMove.length} needs ${partyMembersToMove.length} seats, but only ${availableSeats} available.`,
      );
      return;
    }

    try {
      const assignments = partyMembersToMove.map((g) => ({
        guestId: g.id,
        tableId: toTableId,
      }));

      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/assignments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to move guests");
      }

      if (partyMembersToMove.length > 1) {
        toast.success(`Moved ${partyMembersToMove.length} party members`);
      }
      refreshData();
    } catch (error) {
      console.error("Error moving guest:", error);
      toast.error("Failed to move guest");
    }
  };

  const handleGenerateSeating = async (promptOverride?: string) => {
    if (chart.tables.length === 0) {
      toast.error("Please add tables first");
      return;
    }

    if (chart.unassignedGuests.length === 0 && chart.totalAssigned === 0) {
      toast.error("No confirmed guests to seat");
      return;
    }

    setIsGenerating(true);

    try {
      const body: Record<string, unknown> = { filter };
      if (promptOverride) {
        body.customPrompt = promptOverride;
      }

      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate seating");
      }

      const data = await response.json();

      // Clear existing assignments first
      await fetch(`/api/admin/seating-charts/${chart.id}/assignments`, {
        method: "DELETE",
      });

      // Apply new assignments
      const allAssignments: { guestId: string; tableId: string }[] = [];
      for (const assignment of data.assignments) {
        if (assignment.tableId) {
          for (const guestId of assignment.guestIds) {
            allAssignments.push({ guestId, tableId: assignment.tableId });
          }
        }
      }

      if (allAssignments.length > 0) {
        await fetch(`/api/admin/seating-charts/${chart.id}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: allAssignments }),
        });
      }

      toast.success("AI seating generated!");
      refreshData();
    } catch (error) {
      console.error("Error generating seating:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate seating",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAllAssignments = async () => {
    try {
      const response = await fetch(
        `/api/admin/seating-charts/${chart.id}/assignments`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to clear assignments");
      }

      toast.success("All assignments cleared");
      refreshData();
    } catch (error) {
      console.error("Error clearing assignments:", error);
      toast.error("Failed to clear assignments");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${slug}/admin/seating`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{chart.name}</h1>
            <p className="text-sm text-muted-foreground">
              {chart.totalAssigned} of{" "}
              {chart.totalAssigned + chart.unassignedGuests.length} guests
              seated • {chart.tables.length} tables • {chart.totalCapacity}{" "}
              total seats
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Guest Filters */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Filter className="h-4 w-4 text-muted-foreground ml-1" />
            <Select
              value={filter.list}
              onValueChange={(value: GuestListFilter) => {
                handleFilterChange(value, filter.rsvp);
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-7 w-[130px] border-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GUEST_LIST_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter.rsvp}
              onValueChange={(value: GuestRsvpFilter) => {
                handleFilterChange(filter.list, value);
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-7 w-[130px] border-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GUEST_RSVP_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {events.length > 0 && (
              <Select
                value={filter.eventId ?? "all"}
                onValueChange={handleEventFilterChange}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 w-[150px] border-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "visual" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("visual")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Visual
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddTableDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Table
          </Button>

          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={chart.totalAssigned === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            }
            title="Clear All Assignments"
            description="Are you sure you want to clear all seating assignments? This cannot be undone."
            confirmLabel="Clear All"
            variant="destructive"
            onConfirm={handleClearAllAssignments}
          />

          <Button
            size="sm"
            onClick={() => handleGenerateSeating()}
            disabled={isGenerating || chart.tables.length === 0}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {isGenerating ? "Generating..." : "AI Generate"}
          </Button>

          <Popover
            open={isCustomPromptOpen}
            onOpenChange={setIsCustomPromptOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating || chart.tables.length === 0}
              >
                <MessageSquarePlus className="h-4 w-4 mr-1" />
                Custom Prompt
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Custom Constraints</p>
                  <p className="text-xs text-muted-foreground">
                    Add specific instructions for the AI seating generator.
                  </p>
                </div>
                <Textarea
                  placeholder='e.g., "Keep the Smith and Jones families at the same table" or "Table 1 should be the kids table"'
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isGenerating || !customPrompt.trim()}
                  onClick={() => {
                    setIsCustomPromptOpen(false);
                    handleGenerateSeating(customPrompt.trim());
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {isGenerating ? "Generating..." : "Generate with Constraints"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Editor View */}
      {chart.tables.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tables yet</h3>
          <p className="text-muted-foreground mb-4">
            Add tables to start assigning guests to seats.
          </p>
          <Button onClick={() => setIsAddTableDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Table
          </Button>
        </div>
      ) : viewMode === "visual" ? (
        <VisualEditor
          chart={chart}
          onAssignGuest={handleAssignGuest}
          onUnassignGuest={handleUnassignGuest}
          onMoveGuest={handleMoveGuest}
          onDeleteTable={handleDeleteTable}
        />
      ) : (
        <TableView
          chart={chart}
          onAssignGuest={handleAssignGuest}
          onUnassignGuest={handleUnassignGuest}
          onDeleteTable={handleDeleteTable}
        />
      )}

      {/* Add Table Dialog */}
      <Dialog
        open={isAddTableDialogOpen}
        onOpenChange={setIsAddTableDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
            <DialogDescription>
              Add a new table to your seating chart.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="table-name">Table Name (optional)</Label>
              <Input
                id="table-name"
                placeholder="e.g., Head Table, Family Table"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table-capacity">
                Capacity Override (optional)
              </Label>
              <Input
                id="table-capacity"
                type="number"
                min={1}
                max={20}
                placeholder={`Default: ${chart.defaultSeatsPerTable}`}
                value={newTableCapacity ?? ""}
                onChange={(e) =>
                  setNewTableCapacity(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddTableDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTable}>Add Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Table Confirmation */}
      <AlertDialog
        open={pendingDeleteTableId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTableId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              This table has{" "}
              {chart.tables.find((t) => t.id === pendingDeleteTableId)?.guests
                .length ?? 0}{" "}
              guests assigned. Are you sure you want to delete it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteTableId) {
                  executeDeleteTable(pendingDeleteTableId);
                }
                setPendingDeleteTableId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
