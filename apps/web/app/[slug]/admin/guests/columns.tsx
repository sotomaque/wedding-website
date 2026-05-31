"use client";

import type { Guest } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { CalendarCheck, Check, Link, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  RSVP_STATUS_COLORS as RSVP_COLORS,
  RSVP_STATUS_LABELS as RSVP_LABELS,
} from "@/lib/constants/labels";

type SortableColumn =
  | "firstName"
  | "email"
  | "side"
  | "list"
  | "rsvpStatus"
  | "numberOfResends"
  | "plusOneAllowed"
  | "family"
  | "notes";

interface ColumnsConfig {
  onEditGuest: (guestId: string) => void;
  onSendCalendarInvite: (guestId: string) => Promise<void>;
  onSetRsvp: (
    guestId: string,
    status: "yes" | "no" | "pending",
  ) => Promise<void>;
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
}: {
  guest: Guest;
  onSave: (guestId: string, notes: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(guest.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast.success("Notes updated", {
        description: "Guest notes have been saved",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update notes",
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
}: {
  guest: Guest;
  onSave: (guestId: string, side: "bride" | "groom" | "both") => Promise<void>;
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
      toast.success("Side updated", {
        description: "Guest side has been updated",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update side",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue((guest.side as "bride" | "groom" | "both") || "bride");
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
}: {
  guest: Guest;
  onSave: (guestId: string, list: "a" | "b" | "c") => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<"a" | "b" | "c">(guest.list);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast.success("List updated", {
        description: "Guest list has been updated",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update list",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue(guest.list as "a" | "b" | "c");
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

function EditableRsvpCell({
  guest,
  onSave,
}: {
  guest: Guest;
  onSave: (guestId: string, status: "yes" | "no" | "pending") => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<"yes" | "no" | "pending">(
    guest.rsvpStatus,
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast.success("RSVP updated", {
        description: "Guest RSVP status has been updated",
      });
    } catch {
      toast.error("Error", { description: "Failed to update RSVP status" });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setValue(guest.rsvpStatus as "yes" | "no" | "pending");
    setIsEditing(false);
  }

  const labels = RSVP_LABELS;
  const colors = RSVP_COLORS;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as "yes" | "no" | "pending")}
          className="text-xs border rounded px-2 py-1 bg-background"
          disabled={isSaving}
        >
          <option value="pending">Pending</option>
          <option value="yes">Confirmed</option>
          <option value="no">Declined</option>
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
      className={`px-2 py-1 rounded text-xs font-medium hover:opacity-80 transition-opacity ${colors[guest.rsvpStatus]}`}
      title="Click to change RSVP status"
    >
      {labels[guest.rsvpStatus]}
    </button>
  );
}

function EditableFamilyCell({
  guest,
  onSave,
}: {
  guest: Guest;
  onSave: (guestId: string, family: boolean) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<boolean>(guest.family);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(guest.id, value);
      setIsEditing(false);
      toast.success("Family status updated", {
        description: "Guest family status has been updated",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to update family status",
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
  onEditGuest,
  onSendCalendarInvite,
  onSetRsvp,
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
      id: "name",
      accessorFn: (row) => `${row.firstName} ${row.lastName || ""}`.trim(),
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("firstName")}
          >
            Name{getSortIcon("firstName")}
          </button>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span>
            {`${row.original.firstName} ${row.original.lastName || ""}`.trim()}
          </span>
          {row.original.isPlusOne && (
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
      accessorKey: "inviteCode",
      header: "Invite Code",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-sm bg-secondary px-2 py-1 rounded cursor-pointer hover:bg-secondary/80 transition-colors font-mono"
            onClick={() => {
              const code = row.original.inviteCode ?? "";
              navigator.clipboard.writeText(code);
              toast.success("Copied!", {
                description: "Invite code copied to clipboard",
              });
            }}
            title="Click to copy invite code"
          >
            {row.original.inviteCode}
          </button>
          <button
            type="button"
            className="p-1 rounded cursor-pointer hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => {
              const slug = window.location.pathname.split("/")[1];
              const url = `${window.location.origin}/${slug}/rsvp?code=${row.original.inviteCode}`;
              navigator.clipboard.writeText(url);
              toast.success("RSVP link copied!", {
                description: "Full RSVP URL copied to clipboard",
              });
            }}
            title="Copy RSVP link"
          >
            <Link className="h-3.5 w-3.5" />
          </button>
        </div>
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
        <EditableSideCell guest={row.original} onSave={onUpdateSide} />
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
        <EditableListCell guest={row.original} onSave={onUpdateList} />
      ),
    },
    {
      accessorKey: "rsvpStatus",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("rsvpStatus")}
          >
            Status{getSortIcon("rsvpStatus")}
          </button>
        );
      },
      cell: ({ row }) => (
        <EditableRsvpCell guest={row.original} onSave={onSetRsvp} />
      ),
    },
    {
      accessorKey: "numberOfResends",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("numberOfResends")}
          >
            Email{getSortIcon("numberOfResends")}
          </button>
        );
      },
      cell: ({ row }) => {
        const count = row.original.numberOfResends || 0;
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
      accessorKey: "plusOneAllowed",
      header: () => {
        return (
          <button
            type="button"
            className="flex items-center hover:text-foreground"
            onClick={() => onSort("plusOneAllowed")}
          >
            Plus One{getSortIcon("plusOneAllowed")}
          </button>
        );
      },
      cell: ({ row }) => {
        const allowed = row.original.plusOneAllowed;

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
        <EditableFamilyCell guest={row.original} onSave={onUpdateFamily} />
      ),
    },
    {
      accessorKey: "notes",
      filterFn: (row, _columnId, filterValue) => {
        const notes = (row.getValue("notes") as string) ?? "";
        return notes.toLowerCase().includes(String(filterValue).toLowerCase());
      },
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
        <EditableNotesCell guest={row.original} onSave={onUpdateNotes} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const guest = row.original;
        const canSendCalendarInvite =
          guest.rsvpStatus === "yes" && !!guest.email;
        return (
          <div className="flex items-center gap-1">
            {canSendCalendarInvite && (
              <Button
                variant="outline"
                size="sm"
                title="Send calendar invite"
                onClick={() => onSendCalendarInvite(guest.id)}
              >
                <CalendarCheck className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditGuest(guest.id)}
            >
              Edit
            </Button>
          </div>
        );
      },
    },
  ];
}
