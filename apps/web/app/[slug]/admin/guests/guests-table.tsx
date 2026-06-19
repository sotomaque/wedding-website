"use client";

import type { Guest } from "@prisma/client";
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
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
  AlertCircle,
  CalendarCheck,
  Download,
  Plus,
  RefreshCw,
  SearchX,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { EventOption, PartyOption } from "./actions";
import { AddGuestForm } from "./add-guest-form";
import { createColumns } from "./columns";
import { ExportWizard } from "./export-wizard";
import { GuestsFilters } from "./guests-filters";
import { buildGuestsUrl } from "./guests-url";
import { MergeGuestDialog } from "./merge-guest-dialog";
import { useBulkGuestActions } from "./use-bulk-guest-actions";

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

interface GuestsTableProps {
  initialGuests: Guest[];
  error?: string | null;
  parties: PartyOption[];
  events: EventOption[];
}

export function GuestsTable({
  initialGuests,
  error,
  parties,
  events,
}: GuestsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBulkMerge, setShowBulkMerge] = useState(false);
  // Bulk actions extracted to custom hook — see use-bulk-guest-actions.ts
  const slug = useWeddingSlug();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy") || undefined;
  const currentSortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
  const currentPage = Number.parseInt(searchParams.get("page") || "0", 10);

  const currentSide = searchParams.get("side");
  const currentStatus = searchParams.get("rsvpStatus");
  const hasActiveUrlFilters = currentSide || currentStatus;
  const hasActiveColumnFilters = columnFilters.length > 0;
  const hasActiveFilters = hasActiveUrlFilters || hasActiveColumnFilters;

  // NOTE: handleSort and handleEditGuest are passed into the memoized `columns`
  // below, so they must NOT preserve filters from the captured `searchParams`
  // snapshot (it goes stale between memo rebuilds). buildGuestsUrl reads the
  // live URL instead — see guests-url.ts.
  function handleSort(column: SortableColumn) {
    // Cycle sort order: asc -> desc -> none
    if (currentSortBy === column && currentSortOrder === "desc") {
      router.push(buildGuestsUrl(slug, { sortBy: null, sortOrder: null }));
      return;
    }

    const newSortOrder =
      currentSortBy === column && currentSortOrder === "asc" ? "desc" : "asc";
    router.push(
      buildGuestsUrl(slug, { sortBy: column, sortOrder: newSortOrder }),
    );
  }

  function handlePageChange(newPageIndex: number) {
    router.push(
      buildGuestsUrl(slug, {
        page: newPageIndex === 0 ? null : newPageIndex.toString(),
      }),
    );
  }

  function clearFilters() {
    router.push(`/${slug}/admin/guests`);
  }

  async function handleUpdateNotes(guestId: string, notes: string) {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notes");
      }

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error updating notes:", error);
      throw error;
    }
  }

  async function handleUpdateSide(
    guestId: string,
    side: "bride" | "groom" | "both",
  ) {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side }),
      });

      if (!response.ok) {
        throw new Error("Failed to update side");
      }

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error updating side:", error);
      throw error;
    }
  }

  async function handleUpdateList(guestId: string, list: "a" | "b" | "c") {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list }),
      });

      if (!response.ok) {
        throw new Error("Failed to update list");
      }

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error updating list:", error);
      throw error;
    }
  }

  async function handleUpdateFamily(guestId: string, family: boolean) {
    try {
      const response = await fetch(`/api/admin/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family }),
      });

      if (!response.ok) {
        throw new Error("Failed to update family status");
      }

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error updating family status:", error);
      throw error;
    }
  }

  function handleEditGuest(guestId: string) {
    router.push(buildGuestsUrl(slug, { edit: guestId }), {
      scroll: false,
    });
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are stable within render, memoize to avoid table re-computation
  const columns = useMemo(
    () =>
      createColumns({
        onEditGuest: handleEditGuest,
        onSendCalendarInvite: handleSendCalendarInvite,
        onSetRsvp: handleSetRsvp,
        currentSortBy,
        currentSortOrder,
        onSort: handleSort,
        onUpdateNotes: handleUpdateNotes,
        onUpdateSide: handleUpdateSide,
        onUpdateList: handleUpdateList,
        onUpdateFamily: handleUpdateFamily,
      }),
    [currentSortBy, currentSortOrder],
  );

  const table = useReactTable({
    data: initialGuests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      // Reset to first page when column filters change (search inputs)
      if (currentPage > 0) {
        handlePageChange(0);
      }
    },
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination: {
        pageIndex: currentPage,
        pageSize: 10,
      },
    },
    manualPagination: false,
  });

  // Get selected guests for bulk actions
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedGuests = selectedRows.map((row) => row.original);

  const bulkActions = useBulkGuestActions(selectedGuests, () =>
    setRowSelection({}),
  );

  async function handleSendCalendarInvite(guestId: string) {
    try {
      const response = await fetch(
        `/api/admin/guests/${guestId}/send-calendar-invite`,
        { method: "POST" },
      );
      const data = await response.json();
      if (response.ok) {
        toast.success("Calendar invite sent!", {
          description: `Sent to ${data.email}`,
        });
        router.refresh();
      } else {
        toast.error("Error", {
          description: data.error || "Failed to send calendar invite",
        });
      }
    } catch (error) {
      console.error("Error sending calendar invite:", error);
      toast.error("Error", { description: "Failed to send calendar invite" });
    }
  }

  async function handleSetRsvp(
    guestId: string,
    status: "yes" | "no" | "pending",
  ) {
    const response = await fetch(`/api/admin/guests/${guestId}/set-rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpStatus: status }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to update RSVP status");
    }
    router.refresh();
  }

  function refreshGuests() {
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">
            Guest Management
          </h1>
          <p className="text-muted-foreground">
            Manage wedding guests and send invitations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshGuests}
            className="md:hidden"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={refreshGuests}
            className="hidden md:flex"
          >
            Refresh
          </Button>
          <Button variant="outline" size="icon" asChild className="md:hidden">
            <Link href={`/${slug}/admin/parties`}>
              <UsersRound className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href={`/${slug}/admin/parties`}>
              <UsersRound className="h-4 w-4 mr-2" />
              Parties
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowExport(true)}
            className="md:hidden"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExport(true)}
            className="hidden md:flex"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="icon"
            onClick={() => setShowAddForm(true)}
            className="md:hidden"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            className="hidden md:flex"
          >
            Add Guest
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4 w-full sm:w-auto">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("name")?.setFilterValue(e.target.value)
            }
            className="w-full sm:max-w-sm"
          />
          <Input
            placeholder="Filter by email..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("email")?.setFilterValue(e.target.value)
            }
            className="w-full sm:max-w-sm"
          />
          <Input
            placeholder="Filter by notes..."
            value={(table.getColumn("notes")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("notes")?.setFilterValue(e.target.value)
            }
            className="w-full sm:max-w-sm"
          />
        </div>

        <GuestsFilters events={events} />
      </div>

      {/* Bulk Actions Bar */}
      {selectedGuests.length > 0 && (
        <div className="flex items-center gap-4 p-3 mb-4 bg-secondary/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedGuests.length} guest(s) selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkActions.handleBulkSetRsvp("yes")}
              disabled={bulkActions.isBulkSettingRsvp}
            >
              Mark Attending
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkActions.handleBulkSetRsvp("no")}
              disabled={bulkActions.isBulkSettingRsvp}
            >
              Mark Declined
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkActions.handleBulkSetRsvp("pending")}
              disabled={bulkActions.isBulkSettingRsvp}
            >
              Mark Pending
            </Button>
            <Button
              size="sm"
              onClick={bulkActions.handleBulkSendEmail}
              disabled={
                !bulkActions.canBulkSendEmail || bulkActions.isBulkSending
              }
              title={bulkActions.getEmailValidationMessage() || undefined}
            >
              {bulkActions.isBulkSending ? "Sending..." : "Send Email"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkActions.handleBulkSendCalendarInvites}
              disabled={
                !bulkActions.canBulkSendCalendarInvites ||
                bulkActions.isBulkSendingCalendar
              }
              title={bulkActions.getCalendarValidationMessage() || undefined}
            >
              <CalendarCheck className="h-4 w-4 mr-1" />
              {bulkActions.isBulkSendingCalendar
                ? "Sending..."
                : "Send Calendar Invites"}
            </Button>
            {bulkActions.getCalendarValidationMessage() && (
              <span className="text-xs text-destructive">
                {bulkActions.getCalendarValidationMessage()}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBulkMerge(true)}
            >
              Merge into…
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={bulkActions.isBulkDeleting}
                >
                  {bulkActions.isBulkDeleting ? "Deleting..." : "Delete"}
                </Button>
              }
              title={`Delete ${selectedGuests.length} guest(s)?`}
              description="This permanently removes the selected guests and their RSVP information. This cannot be undone."
              confirmLabel="Delete"
              variant="destructive"
              onConfirm={bulkActions.handleBulkDelete}
            />
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

      <MergeGuestDialog
        open={showBulkMerge}
        onOpenChange={setShowBulkMerge}
        sourceIds={selectedGuests.map((g) => g.id)}
        sourceLabel={
          selectedGuests.length === 1
            ? `${selectedGuests[0]?.firstName ?? "guest"}`
            : `${selectedGuests.length} guests`
        }
        onMerged={() => {
          setRowSelection({});
          router.refresh();
        }}
      />

      {/* Table */}
      <div className="-mx-2 sm:-mx-4 md:mx-0 md:rounded-md md:border">
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
                <TableRow key={row.id}>
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
                <TableCell colSpan={columns.length} className="h-64">
                  {error ? (
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <AlertCircle className="text-destructive" />
                        </EmptyMedia>
                        <EmptyTitle>Failed to load guests</EmptyTitle>
                        <EmptyDescription>{error}</EmptyDescription>
                      </EmptyHeader>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshGuests}
                      >
                        Try again
                      </Button>
                    </Empty>
                  ) : hasActiveFilters ? (
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchX />
                        </EmptyMedia>
                        <EmptyTitle>No guests match your filters</EmptyTitle>
                        <EmptyDescription>
                          Try adjusting your filters or search criteria
                        </EmptyDescription>
                      </EmptyHeader>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    </Empty>
                  ) : (
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Users />
                        </EmptyMedia>
                        <EmptyTitle>No guests yet</EmptyTitle>
                        <EmptyDescription>
                          Add your first guest to get started with your guest
                          list
                        </EmptyDescription>
                      </EmptyHeader>
                      <Button size="sm" onClick={() => setShowAddForm(true)}>
                        Add Guest
                      </Button>
                    </Empty>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing page {currentPage + 1} of {table.getPageCount()} (
          {table.getFilteredRowModel().rows.length} guest(s) total)
        </div>
        <div className="flex gap-2">
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

      {/* Add Guest Form Sheet */}
      <AddGuestForm
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => {
          setShowAddForm(false);
          refreshGuests();
        }}
        parties={parties}
        events={events}
      />

      {/* Export Wizard */}
      <ExportWizard open={showExport} onOpenChange={setShowExport} />
    </>
  );
}
