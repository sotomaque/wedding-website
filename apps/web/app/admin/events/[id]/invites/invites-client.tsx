"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
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
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Crown,
  Heart,
  Mail,
  MapPin,
  RotateCcw,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InvitesFilters } from "./invites-filters";

type BridalPartyRole =
  | "groomsman"
  | "best_man"
  | "bridesmaid"
  | "maid_of_honor"
  | null;

interface Guest {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  inviteCode: string;
  mainRsvpStatus: "pending" | "yes" | "no";
  side: "bride" | "groom" | "both" | null;
  list: "a" | "b" | "c";
  family: boolean;
  bridalPartyRole: BridalPartyRole;
  isInvited: boolean;
  eventRsvpStatus: "pending" | "yes" | "no" | null;
  emailSent: boolean;
  emailSentAt: string | null;
  emailResendCount: number;
}

interface Event {
  id: string;
  name: string;
  eventDate: string | null;
  startTime: string | null;
  locationName: string | null;
}

interface InvitesClientProps {
  event: Event;
  initialGuests: Guest[];
  totalCount: number;
}

export function InvitesClient({
  event,
  initialGuests,
  totalCount,
}: InvitesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use initialGuests directly from server - no local state for guests
  const guests = initialGuests;

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get current page from URL
  const currentPage = Number.parseInt(searchParams.get("page") || "0", 10);

  // Warning dialog state
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "add" | "send";
    guests: Guest[];
    nonRsvpdGuests: Guest[];
  } | null>(null);

  const basePath = `/admin/events/${event.id}/invites`;

  function handlePageChange(newPageIndex: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (newPageIndex === 0) {
      params.delete("page");
    } else {
      params.set("page", newPageIndex.toString());
    }

    router.push(`${basePath}?${params.toString()}`);
  }

  const columns: ColumnDef<Guest>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "name",
        accessorFn: (row) =>
          `${row.firstName} ${row.lastName || ""}`.trim().toLowerCase(),
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {row.original.firstName} {row.original.lastName}
            </span>
            {row.original.bridalPartyRole && (
              <span title={row.original.bridalPartyRole.replace("_", " ")}>
                <Crown className="h-4 w-4 text-yellow-500" />
              </span>
            )}
            {row.original.family && (
              <span title="Family">
                <Heart className="h-4 w-4 text-pink-500" />
              </span>
            )}
          </div>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.email || "—"}
          </span>
        ),
        filterFn: "includesString",
      },
      {
        id: "weddingRsvp",
        header: "Wedding RSVP",
        cell: ({ row }) => {
          const status = row.original.mainRsvpStatus;
          if (status === "yes") {
            return <Badge className="bg-green-500">Confirmed</Badge>;
          }
          if (status === "no") {
            return <Badge variant="destructive">Declined</Badge>;
          }
          return (
            <Badge
              variant="outline"
              className="text-orange-600 border-orange-600"
            >
              Pending
            </Badge>
          );
        },
      },
      {
        id: "invited",
        header: "Event Invited",
        cell: ({ row }) =>
          row.original.isInvited ? (
            <Badge variant="default" className="bg-green-500">
              Yes
            </Badge>
          ) : (
            <Badge variant="secondary">No</Badge>
          ),
      },
      {
        id: "emailSent",
        header: "Email Sent",
        cell: ({ row }) => {
          if (!row.original.isInvited)
            return <span className="text-muted-foreground">—</span>;
          if (row.original.emailSent) {
            const count = row.original.emailResendCount;
            return (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                {count > 1 ? `Sent (${count}x)` : "Sent"}
              </Badge>
            );
          }
          return (
            <Badge
              variant="outline"
              className="text-orange-600 border-orange-600"
            >
              Not sent
            </Badge>
          );
        },
      },
      {
        id: "eventRsvpStatus",
        header: "Event RSVP",
        cell: ({ row }) => {
          if (!row.original.isInvited)
            return <span className="text-muted-foreground">—</span>;
          const status = row.original.eventRsvpStatus;
          if (status === "yes") {
            return <Badge className="bg-green-500">Confirmed</Badge>;
          }
          if (status === "no") {
            return <Badge variant="destructive">Declined</Badge>;
          }
          return <Badge variant="secondary">Pending</Badge>;
        },
      },
      {
        id: "side",
        header: "Side",
        cell: ({ row }) => {
          const side = row.original.side;
          if (!side) return <span className="text-muted-foreground">—</span>;
          return <span className="capitalize">{side}</span>;
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: guests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      // Reset to first page when column filters change (search inputs)
      if (currentPage > 0) {
        handlePageChange(0);
      }
    },
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      rowSelection,
      pagination: {
        pageIndex: currentPage,
        pageSize: 20,
      },
    },
    manualPagination: false,
  });

  // Get selected guests
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedGuests = selectedRows.map((row) => row.original);

  // Check if selected guests can perform actions
  const selectedInvited = selectedGuests.filter((g) => g.isInvited);
  const selectedNotInvited = selectedGuests.filter((g) => !g.isInvited);
  const selectedInvitedWithEmail = selectedInvited.filter((g) =>
    g.email?.includes("@"),
  );

  // Check for non-RSVP'd guests (wedding)
  const selectedNotRsvpd = selectedGuests.filter(
    (g) => g.mainRsvpStatus !== "yes",
  );

  function checkAndHandleAddToEvent() {
    if (selectedNotInvited.length === 0) return;

    const nonRsvpd = selectedNotInvited.filter(
      (g) => g.mainRsvpStatus !== "yes",
    );

    if (nonRsvpd.length > 0) {
      setPendingAction({
        type: "add",
        guests: selectedNotInvited,
        nonRsvpdGuests: nonRsvpd,
      });
      setShowWarningDialog(true);
    } else {
      handleAddToEvent(selectedNotInvited);
    }
  }

  function checkAndHandleSendInvitations() {
    if (selectedInvitedWithEmail.length === 0) return;

    const nonRsvpd = selectedInvitedWithEmail.filter(
      (g) => g.mainRsvpStatus !== "yes",
    );

    if (nonRsvpd.length > 0) {
      setPendingAction({
        type: "send",
        guests: selectedInvitedWithEmail,
        nonRsvpdGuests: nonRsvpd,
      });
      setShowWarningDialog(true);
    } else {
      handleSendInvitations(selectedInvitedWithEmail);
    }
  }

  async function handleAddToEvent(guestsToAdd: Guest[]) {
    if (guestsToAdd.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestIds: guestsToAdd.map((g) => g.id),
        }),
      });

      if (!response.ok) throw new Error("Failed to add guests");

      const data = await response.json();
      toast.success(`Added ${data.addedCount} guest(s) to event`);

      // Clear selection and refresh server data
      setRowSelection({});
      router.refresh();
    } catch (error) {
      console.error("Error adding guests:", error);
      toast.error("Failed to add guests to event");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveFromEvent() {
    if (selectedInvited.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${event.id}/invites`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestIds: selectedInvited.map((g) => g.id),
        }),
      });

      if (!response.ok) throw new Error("Failed to remove guests");

      const data = await response.json();
      toast.success(`Removed ${data.removedCount} guest(s) from event`);

      // Clear selection and refresh server data
      setRowSelection({});
      router.refresh();
    } catch (error) {
      console.error("Error removing guests:", error);
      toast.error("Failed to remove guests from event");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendInvitations(guestsToEmail: Guest[]) {
    if (guestsToEmail.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/events/${event.id}/send-invites`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestIds: guestsToEmail.map((g) => g.id),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitations");
      }

      toast.success(`Sent ${data.sentCount} invitation(s)`);

      // Clear selection and refresh server data
      setRowSelection({});
      router.refresh();
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitations",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleWarningConfirm() {
    if (!pendingAction) return;

    if (pendingAction.type === "add") {
      handleAddToEvent(pendingAction.guests);
    } else {
      handleSendInvitations(pendingAction.guests);
    }

    setShowWarningDialog(false);
    setPendingAction(null);
  }

  function handleWarningCancel() {
    setShowWarningDialog(false);
    setPendingAction(null);
  }

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get counts (from current filtered guests for stats)
  const invitedCount = guests.filter((g) => g.isInvited).length;
  const emailSentCount = guests.filter((g) => g.emailSent).length;
  const confirmedCount = guests.filter(
    (g) => g.eventRsvpStatus === "yes",
  ).length;
  const declinedCount = guests.filter((g) => g.eventRsvpStatus === "no").length;

  // Check if any URL filters are active
  const hasActiveFilters =
    searchParams.get("side") ||
    searchParams.get("family") ||
    searchParams.get("bridalParty") ||
    searchParams.get("weddingRsvp") ||
    searchParams.get("eventInvited") ||
    searchParams.get("emailSent") ||
    searchParams.get("eventRsvp");

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 py-8">
      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Guests Haven't RSVP'd to Wedding
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {pendingAction?.nonRsvpdGuests.length === 1
                  ? "1 guest hasn't"
                  : `${pendingAction?.nonRsvpdGuests.length} guests haven't`}{" "}
                confirmed their attendance to the wedding yet:
              </p>
              <ul className="list-disc list-inside text-sm max-h-32 overflow-y-auto bg-muted rounded-md p-2">
                {pendingAction?.nonRsvpdGuests.map((g) => (
                  <li key={g.id}>
                    {g.firstName} {g.lastName}{" "}
                    <span className="text-muted-foreground">
                      ({g.mainRsvpStatus === "pending" ? "pending" : "declined"}
                      )
                    </span>
                  </li>
                ))}
              </ul>
              <p className="font-medium">
                {pendingAction?.type === "add"
                  ? "Do you want to invite them to this event anyway?"
                  : "Do you want to send them an event invitation anyway?"}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleWarningCancel}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                toast.info("Resend RSVP feature coming soon");
                handleWarningCancel();
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Resend Wedding RSVP
            </Button>
            <AlertDialogAction onClick={handleWarningConfirm}>
              <Check className="h-4 w-4 mr-1" />
              {pendingAction?.type === "add" ? "Add Anyway" : "Send Anyway"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/events"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        <h1 className="text-2xl font-bold mb-2">
          Manage Invites: {event.name}
        </h1>

        {/* Event Details */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {event.eventDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </span>
            </div>
          )}
          {event.startTime && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(event.startTime)}</span>
            </div>
          )}
          {event.locationName && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{event.locationName}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="bg-secondary/50 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold">{invitedCount}</span>
            <span className="text-muted-foreground ml-2">Invited</span>
          </div>
          <div className="bg-secondary/50 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold">{emailSentCount}</span>
            <span className="text-muted-foreground ml-2">Emails Sent</span>
          </div>
          <div className="bg-green-500/10 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold text-green-600">
              {confirmedCount}
            </span>
            <span className="text-muted-foreground ml-2">Confirmed</span>
          </div>
          <div className="bg-red-500/10 rounded-lg px-4 py-2">
            <span className="text-2xl font-bold text-red-600">
              {declinedCount}
            </span>
            <span className="text-muted-foreground ml-2">Declined</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("name")?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
          <Input
            placeholder="Search by email..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("email")?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
        </div>

        <InvitesFilters eventId={event.id} />
      </div>

      {/* Showing count with filter info */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground mb-4">
          Showing {guests.length} of {totalCount} guests (filtered)
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedGuests.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-3 mb-4 bg-secondary/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedGuests.length} guest(s) selected
            {selectedNotRsvpd.length > 0 && (
              <span className="text-orange-600 ml-2">
                ({selectedNotRsvpd.length} not RSVP'd to wedding)
              </span>
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedNotInvited.length > 0 && (
              <Button
                size="sm"
                onClick={checkAndHandleAddToEvent}
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add to Event ({selectedNotInvited.length})
              </Button>
            )}
            {selectedInvited.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveFromEvent}
                disabled={isLoading}
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Remove ({selectedInvited.length})
              </Button>
            )}
            {selectedInvitedWithEmail.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={checkAndHandleSendInvitations}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4 mr-1" />
                Send Invitation ({selectedInvitedWithEmail.length})
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowSelection({})}
            className="ml-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    row.original.mainRsvpStatus !== "yes" &&
                    row.original.isInvited
                      ? "bg-orange-50/50"
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No guests found.</p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(basePath)}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing page {currentPage + 1} of {table.getPageCount()} (
          {table.getFilteredRowModel().rows.length} guest(s))
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
