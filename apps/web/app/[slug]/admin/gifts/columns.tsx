"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Check, ExternalLink, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Gift {
  id: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripePaymentLinkId: string | null;
  stripeChargeId: string | null;
  donorEmail: string | null;
  donorName: string | null;
  amountCents: number;
  currency: string;
  giftType: "baby_fund" | "honeymoon" | "student_loans" | null;
  guestId: string | null;
  status: "pending" | "completed" | "refunded" | "failed";
  thankYouEmailSent: boolean;
  thankYouEmailSentAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
}

type SortableColumn =
  | "createdAt"
  | "amountCents"
  | "donorName"
  | "giftType"
  | "status";

interface ColumnsConfig {
  currentSortBy?: string;
  currentSortOrder?: "asc" | "desc";
  onSort: (column: SortableColumn) => void;
  onEdit: (giftId: string) => void;
  onUpdateNotes: (giftId: string, notes: string) => Promise<void>;
}

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const giftTypeLabels: Record<string, string> = {
  baby_fund: "Baby Fund",
  honeymoon: "Honeymoon",
  student_loans: "Student Loans",
};

const giftTypeColors: Record<string, string> = {
  baby_fund: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  honeymoon: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  student_loans:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const statusColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  refunded:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function EditableNotesCell({
  gift,
  onSave,
}: {
  gift: Gift;
  onSave: (giftId: string, notes: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(gift.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(gift.id, value);
      setIsEditing(false);
      toast.success("Notes updated", {
        description: "Gift notes have been saved",
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
    setValue(gift.notes || "");
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

export function createColumns({
  currentSortBy,
  currentSortOrder,
  onSort,
  onEdit,
  onUpdateNotes,
}: ColumnsConfig): ColumnDef<Gift>[] {
  const getSortIcon = (columnKey: string) => {
    if (currentSortBy === columnKey) {
      return currentSortOrder === "asc" ? " ↑" : " ↓";
    }
    return "";
  };

  return [
    {
      accessorKey: "createdAt",
      header: () => (
        <button
          type="button"
          className="flex items-center hover:text-foreground"
          onClick={() => onSort("createdAt")}
        >
          Date{getSortIcon("createdAt")}
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: "donorName",
      header: () => (
        <button
          type="button"
          className="flex items-center hover:text-foreground"
          onClick={() => onSort("donorName")}
        >
          Donor{getSortIcon("donorName")}
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.donorName || "Anonymous"}
          </span>
          {row.original.donorEmail && (
            <span className="text-xs text-muted-foreground">
              {row.original.donorEmail}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "amountCents",
      header: () => (
        <button
          type="button"
          className="flex items-center hover:text-foreground"
          onClick={() => onSort("amountCents")}
        >
          Amount{getSortIcon("amountCents")}
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(row.original.amountCents, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "giftType",
      header: () => (
        <button
          type="button"
          className="flex items-center hover:text-foreground"
          onClick={() => onSort("giftType")}
        >
          Fund{getSortIcon("giftType")}
        </button>
      ),
      cell: ({ row }) => {
        const type = row.original.giftType;
        if (!type) {
          return (
            <span className="text-xs text-muted-foreground italic">
              Unknown
            </span>
          );
        }
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${giftTypeColors[type] || ""}`}
          >
            {giftTypeLabels[type] || type}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <button
          type="button"
          className="flex items-center hover:text-foreground"
          onClick={() => onSort("status")}
        >
          Status{getSortIcon("status")}
        </button>
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[status] || ""}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      id: "matched_guest",
      header: "Matched Guest",
      cell: ({ row }) => {
        if (!row.original.guestId) {
          return (
            <span className="text-xs text-muted-foreground">No match</span>
          );
        }
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {row.original.guestFirstName} {row.original.guestLastName}
            </span>
            {row.original.guestEmail && (
              <span className="text-xs text-muted-foreground">
                {row.original.guestEmail}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "thankYouEmailSent",
      header: "Thank You",
      cell: ({ row }) => {
        if (row.original.thankYouEmailSent) {
          return (
            <span className="text-xs text-green-600 font-medium">Sent</span>
          );
        }
        return <span className="text-xs text-muted-foreground">Not sent</span>;
      },
    },
    {
      id: "stripe",
      header: "Stripe",
      cell: ({ row }) => {
        const chargeId = row.original.stripeChargeId;
        if (!chargeId) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <a
            href={`https://dashboard.stripe.com/payments/${row.original.stripePaymentIntentId || chargeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            View
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <EditableNotesCell gift={row.original} onSave={onUpdateNotes} />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(row.original.id)}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit gift</span>
        </Button>
      ),
    },
  ];
}
