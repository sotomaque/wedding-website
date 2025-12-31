"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Check, X } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/lib/supabase/types";

type Guest = Database["public"]["Tables"]["guests"]["Row"];

type SortableColumn =
  | "first_name"
  | "email"
  | "side"
  | "list"
  | "rsvp_status"
  | "number_of_resends"
  | "plus_one_allowed"
  | "family"
  | "notes";

interface ColumnsConfig {
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  onEditGuest: (guestId: string) => void;
  currentSortBy?: string;
  currentSortOrder?: "asc" | "desc";
  onSort: (column: SortableColumn) => void;
  onUpdateNotes: (guestId: string, notes: string) => Promise<void>;
  onUpdateSide: (
    guestId: string,
    side: "bride" | "groom" | "both",
  ) => Promise<void>;
  onUpdateList: (guestId: string, list: "a" | "b" | "c") => Promise<void>;
  onUpdateFamily: (guestId: string, family: boolean) => Promise<void>;
}

function EditableNotesCell({
  guest,
  onSave,
  toast,
}: {
  guest: Guest;
  onSave: (guestId: string, notes: string) => Promise<void>;
  toast: ColumnsConfig["toast"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(guest.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast({
        title: "Notes updated",
        description: "Guest notes have been saved",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue(guest.notes || "");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[200px]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 min-h-[60px] text-xs border rounded px-2 py-1 bg-background resize-none"
          placeholder="Add notes..."
          disabled={isSaving}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleCancel();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const displayValue = value || "—";
  const truncated =
    value.length > 50 ? `${value.slice(0, 50)}...` : displayValue;

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs text-left hover:bg-secondary/50 px-2 py-1 rounded transition-colors w-full"
      title={value || "Click to add notes"}
    >
      <span className={!value ? "text-muted-foreground" : ""}>{truncated}</span>
    </button>
  );
}

function EditableSideCell({
  guest,
  onSave,
  toast,
}: {
  guest: Guest;
  onSave: (guestId: string, side: "bride" | "groom" | "both") => Promise<void>;
  toast: ColumnsConfig["toast"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<"bride" | "groom" | "both">(
    guest.side || "bride",
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast({
        title: "Side updated",
        description: "Guest side has been updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update side",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue(guest.side || "bride");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <select
          value={value}
          onChange={(e) =>
            setValue(e.target.value as "bride" | "groom" | "both")
          }
          className="text-xs border rounded px-2 py-1 bg-background"
          disabled={isSaving}
        >
          <option value="bride">Bride</option>
          <option value="groom">Groom</option>
          <option value="both">Both</option>
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            title="Save"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs capitalize hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
      title="Click to edit side"
    >
      {guest.side || "—"}
    </button>
  );
}

function EditableListCell({
  guest,
  onSave,
  toast,
}: {
  guest: Guest;
  onSave: (guestId: string, list: "a" | "b" | "c") => Promise<void>;
  toast: ColumnsConfig["toast"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<"a" | "b" | "c">(guest.list);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast({
        title: "List updated",
        description: "Guest list has been updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update list",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue(guest.list);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as "a" | "b" | "c")}
          className="text-xs border rounded px-2 py-1 bg-background"
          disabled={isSaving}
        >
          <option value="a">A List</option>
          <option value="b">B List</option>
          <option value="c">C List</option>
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            title="Save"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs uppercase font-semibold hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
      title="Click to edit list"
    >
      {guest.list}
    </button>
  );
}

function EditableFamilyCell({
  guest,
  onSave,
  toast,
}: {
  guest: Guest;
  onSave: (guestId: string, family: boolean) => Promise<void>;
  toast: ColumnsConfig["toast"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<boolean>(guest.family);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast({
        title: "Family status updated",
        description: "Guest family status has been updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update family status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue(guest.family);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <select
          value={value ? "yes" : "no"}
          onChange={(e) => setValue(e.target.value === "yes")}
          className="text-xs border rounded px-2 py-1 bg-background"
          disabled={isSaving}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            title="Save"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
      title="Click to edit family status"
    >
      {guest.family ? "✓" : "—"}
    </button>
  );
}

export function createColumns({
  toast,
  onEditGuest,
  currentSortBy,
  currentSortOrder,
  onSort,
  onUpdateNotes,
  onUpdateSide,
  onUpdateList,
  onUpdateFamily,
}: ColumnsConfig): ColumnDef<Guest>[] {
  const getSortIcon = (columnKey: string) => {
    if (currentSortBy === columnKey) {
      return currentSortOrder === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  return [
    {
      id: "name",
      accessorFn: (row) => `${row.first_name} ${row.last_name || ""}`.trim(),
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("first_name")}
          >
            Name{getSortIcon("first_name")}
          </button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>
            {`${row.original.first_name} ${row.original.last_name || ""}`.trim()}
          </span>
          {row.original.is_plus_one && (
            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded">
              +1
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("email")}
          >
            Email{getSortIcon("email")}
          </button>
        );
      },
    },
    {
      accessorKey: "invite_code",
      header: "Invite Code",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-sm bg-secondary px-2 py-1 rounded cursor-pointer hover:bg-secondary/80 transition-colors font-mono"
          onClick={() => {
            const code = row.original.invite_code;
            navigator.clipboard.writeText(code);
            toast({
              title: "Copied!",
              description: "Invite code copied to clipboard",
            });
          }}
          title="Click to copy invite code"
        >
          {row.original.invite_code}
        </button>
      ),
    },
    {
      accessorKey: "side",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("side")}
          >
            Side{getSortIcon("side")}
          </button>
        );
      },
      cell: ({ row }) => (
        <EditableSideCell
          guest={row.original}
          onSave={onUpdateSide}
          toast={toast}
        />
      ),
    },
    {
      accessorKey: "list",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("list")}
          >
            List{getSortIcon("list")}
          </button>
        );
      },
      cell: ({ row }) => (
        <EditableListCell
          guest={row.original}
          onSave={onUpdateList}
          toast={toast}
        />
      ),
    },
    {
      accessorKey: "rsvp_status",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("rsvp_status")}
          >
            Status{getSortIcon("rsvp_status")}
          </button>
        );
      },
      cell: ({ row }) => {
        const status = row.original.rsvp_status;
        const labels = {
          pending: "Pending",
          yes: "Confirmed",
          no: "Denied",
        };
        const colors = {
          pending: "bg-yellow-100 text-yellow-800",
          yes: "bg-green-100 text-green-800",
          no: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}
          >
            {labels[status]}
          </span>
        );
      },
    },
    {
      accessorKey: "number_of_resends",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("number_of_resends")}
          >
            Email{getSortIcon("number_of_resends")}
          </button>
        );
      },
      cell: ({ row }) => {
        const count = row.original.number_of_resends || 0;
        if (count === 0) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              Not sent
            </span>
          );
        }
        if (count === 1) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Sent
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Resent ({count})
          </span>
        );
      },
    },
    {
      accessorKey: "plus_one_allowed",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("plus_one_allowed")}
          >
            Plus One{getSortIcon("plus_one_allowed")}
          </button>
        );
      },
      cell: ({ row }) => {
        const allowed = row.original.plus_one_allowed;

        if (allowed) {
          return (
            <span className="text-xs text-green-600 font-medium">
              ✓ Allowed
            </span>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">Not allowed</span>
        );
      },
    },
    {
      accessorKey: "family",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("family")}
          >
            Family{getSortIcon("family")}
          </button>
        );
      },
      cell: ({ row }) => (
        <EditableFamilyCell
          guest={row.original}
          onSave={onUpdateFamily}
          toast={toast}
        />
      ),
    },
    {
      accessorKey: "notes",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("notes")}
          >
            Notes{getSortIcon("notes")}
          </button>
        );
      },
      cell: ({ row }) => (
        <EditableNotesCell
          guest={row.original}
          onSave={onUpdateNotes}
          toast={toast}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEditGuest(row.original.id)}
        >
          Edit
        </Button>
      ),
    },
  ];
}
