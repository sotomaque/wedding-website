"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Merge,
  MoreHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { PartyWithGuests } from "./actions";

interface ColumnsConfig {
  onEditParty: (partyId: string) => void;
  onMerge: (party: PartyWithGuests) => void;
  onDelete: (party: PartyWithGuests) => void;
  onSaveName: (partyId: string, name: string | null) => Promise<void>;
  expandedParties: Set<string>;
  onToggleExpand: (partyId: string) => void;
}

function SortableHeader<T>({
  column,
  label,
}: {
  column: Column<T>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground"
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

function EditableNameCell({
  party,
  onSave,
}: {
  party: PartyWithGuests;
  onSave: (partyId: string, name: string | null) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(party.name || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(party.id, value.trim() || null);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Party name..."
          className="h-8 w-40"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            else if (e.key === "Escape") {
              setValue(party.name || "");
              setIsEditing(false);
            }
          }}
          disabled={isSaving}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(party.name || "");
            setIsEditing(false);
          }}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-left hover:underline cursor-pointer"
    >
      {party.name ? (
        <span className="font-medium">{party.name}</span>
      ) : (
        <span className="text-muted-foreground text-sm italic">
          Click to add name...
        </span>
      )}
    </button>
  );
}

export function createColumns({
  onEditParty,
  onMerge,
  onDelete,
  onSaveName,
  expandedParties,
  onToggleExpand,
}: ColumnsConfig): ColumnDef<PartyWithGuests>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 cursor-pointer"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const party = row.original;
        if (party.guestCount === 0) return null;
        const isExpanded = expandedParties.has(party.id);
        return (
          <button
            type="button"
            onClick={() => onToggleExpand(party.id)}
            className="p-1 hover:bg-secondary rounded"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "invite_code",
      header: ({ column }) => (
        <SortableHeader column={column} label="Invite Code" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">
          {row.original.invite_code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} label="Party Name" />
      ),
      cell: ({ row }) => (
        <EditableNameCell party={row.original} onSave={onSaveName} />
      ),
    },
    {
      id: "members",
      accessorFn: (row) =>
        row.guests
          .map((g) => `${g.first_name} ${g.last_name || ""}`.trim())
          .join(" "),
      header: "Guests",
      cell: ({ row }) => {
        const party = row.original;
        return (
          <span className="text-muted-foreground text-sm">
            {party.guests
              .slice(0, 2)
              .map((g) => g.first_name)
              .join(", ")}
            {party.guestCount > 2 && ` +${party.guestCount - 2}`}
          </span>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "side",
      header: ({ column }) => <SortableHeader column={column} label="Side" />,
      cell: ({ row }) => (
        <span className="text-sm capitalize">{row.original.side || "—"}</span>
      ),
    },
    {
      accessorKey: "list",
      header: ({ column }) => <SortableHeader column={column} label="List" />,
      cell: ({ row }) => (
        <span className="text-sm font-semibold uppercase">
          {row.original.list || "—"}
        </span>
      ),
    },
    {
      id: "size",
      accessorFn: (row) => row.guestCount,
      header: ({ column }) => <SortableHeader column={column} label="Size" />,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-sm">
          <Users className="h-3 w-3" />
          {row.original.guestCount}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const party = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditParty(party.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Party
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMerge(party)}>
                <Merge className="h-4 w-4 mr-2" />
                Merge Into...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(party)}
                disabled={party.guestCount > 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Party
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];
}
