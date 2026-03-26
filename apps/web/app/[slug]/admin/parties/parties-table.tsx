"use client";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Merge, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { PartyWithGuests } from "./actions";
import {
  bulkDeleteParties,
  bulkMergeParties,
  deleteParty,
  mergeParties,
  updateParty,
} from "./actions";
import { createColumns } from "./columns";
import { EditPartySheet } from "./edit-party-sheet";
import { PartiesFilters } from "./parties-filters";

interface PartiesTableProps {
  initialParties: PartyWithGuests[];
  error: string | null;
}

export function PartiesTable({ initialParties, error }: PartiesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();
  const [isPending, startTransition] = useTransition();

  // TanStack state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Expanded rows (managed manually, not via TanStack)
  const [expandedParties, setExpandedParties] = useState<Set<string>>(
    new Set(),
  );

  // Dialogs
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean;
    sourceParty: PartyWithGuests | null;
    targetPartyId: string;
  }>({ open: false, sourceParty: null, targetPartyId: "" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    party: PartyWithGuests | null;
  }>({ open: false, party: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [bulkMergeDialog, setBulkMergeDialog] = useState(false);
  const [bulkMergeTargetId, setBulkMergeTargetId] = useState("");

  const currentPage = Number.parseInt(searchParams.get("page") || "0", 10);

  // Edit sheet from URL
  const editPartyId = searchParams.get("edit");
  const editingParty = editPartyId
    ? initialParties.find((p) => p.id === editPartyId)
    : null;

  function handlePageChange(newPageIndex: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPageIndex === 0) {
      params.delete("page");
    } else {
      params.set("page", newPageIndex.toString());
    }
    router.push(`/${slug}/admin/parties?${params.toString()}`);
  }

  function openEditSheet(partyId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", partyId);
    router.push(`/${slug}/admin/parties?${params.toString()}`, {
      scroll: false,
    });
  }

  function closeEditSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.push(`/${slug}/admin/parties?${params.toString()}`, {
      scroll: false,
    });
  }

  function toggleExpanded(partyId: string) {
    setExpandedParties((prev) => {
      const next = new Set(prev);
      if (next.has(partyId)) next.delete(partyId);
      else next.add(partyId);
      return next;
    });
  }

  async function handleSaveName(partyId: string, name: string | null) {
    const result = await updateParty(partyId, { name });
    if (result.success) {
      toast.success("Party name updated");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update party name");
    }
  }

  function handleMerge() {
    const sourceParty = mergeDialog.sourceParty;
    if (!sourceParty || !mergeDialog.targetPartyId) return;

    startTransition(async () => {
      const result = await mergeParties(
        sourceParty.id,
        mergeDialog.targetPartyId,
      );
      if (result.success) {
        toast.success("Parties merged successfully");
        setMergeDialog({ open: false, sourceParty: null, targetPartyId: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to merge parties");
      }
    });
  }

  function handleDelete() {
    const party = deleteDialog.party;
    if (!party) return;

    startTransition(async () => {
      const result = await deleteParty(party.id);
      if (result.success) {
        toast.success("Party deleted successfully");
        setDeleteDialog({ open: false, party: null });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete party");
      }
    });
  }

  const columns = createColumns({
    onEditParty: openEditSheet,
    onMerge: (party) =>
      setMergeDialog({ open: true, sourceParty: party, targetPartyId: "" }),
    onDelete: (party) => setDeleteDialog({ open: true, party }),
    onSaveName: handleSaveName,
    expandedParties,
    onToggleExpand: toggleExpanded,
  });

  const table = useReactTable({
    data: initialParties,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      if (currentPage > 0) handlePageChange(0);
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

  // Compute selected from table
  const selectedPartyRows = table.getFilteredSelectedRowModel().rows;
  const selectedPartyObjects = selectedPartyRows.map((r) => r.original);
  const emptySelectedParties = selectedPartyObjects.filter(
    (p) => p.guestCount === 0,
  );
  const nonEmptySelectedParties = selectedPartyObjects.filter(
    (p) => p.guestCount > 0,
  );

  function handleBulkDelete() {
    startTransition(async () => {
      const ids = selectedPartyObjects.map((p) => p.id);
      const result = await bulkDeleteParties(ids);
      if (result.success) {
        const msg =
          result.skippedCount > 0
            ? `Deleted ${result.deletedCount} party(ies). ${result.skippedCount} skipped (have guests).`
            : `Deleted ${result.deletedCount} party(ies).`;
        toast.success(msg);
        setRowSelection({});
        setBulkDeleteDialog(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete parties");
      }
    });
  }

  function handleBulkMerge() {
    if (!bulkMergeTargetId) return;

    startTransition(async () => {
      const sourceIds = selectedPartyObjects
        .map((p) => p.id)
        .filter((id) => id !== bulkMergeTargetId);
      const result = await bulkMergeParties(sourceIds, bulkMergeTargetId);
      if (result.success) {
        toast.success(`Merged ${result.mergedCount} party(ies) successfully`);
        setRowSelection({});
        setBulkMergeDialog(false);
        setBulkMergeTargetId("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to merge parties");
      }
    });
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.refresh()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif text-foreground">
            Party Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage guest groupings and party assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" asChild className="md:hidden">
            <Link href={`/${slug}/admin/guests`}>
              <UsersRound className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href={`/${slug}/admin/guests`}>
              <UsersRound className="h-4 w-4 mr-2" />
              Guests
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          placeholder="Search by guest name..."
          value={(table.getColumn("members")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("members")?.setFilterValue(e.target.value)
          }
          className="max-w-sm"
        />
        <PartiesFilters />
      </div>

      {/* Bulk Actions Bar */}
      {selectedPartyObjects.length > 0 && (
        <div className="flex items-center gap-4 p-3 mb-4 bg-secondary/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedPartyObjects.length} party(ies) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected
            </Button>
            {selectedPartyObjects.length >= 2 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBulkMergeTargetId("");
                  setBulkMergeDialog(true);
                }}
              >
                <Merge className="h-4 w-4 mr-1" />
                Merge Selected
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
              table.getRowModel().rows.map((row) => {
                const party = row.original;
                const isExpanded = expandedParties.has(party.id);
                return (
                  <Fragment key={row.id}>
                    <TableRow>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && party.guests.length > 0 && (
                      <TableRow className="bg-secondary/20">
                        <TableCell
                          colSpan={columns.length}
                          className="px-4 py-3"
                        >
                          <div className="pl-8">
                            <p className="text-xs text-muted-foreground mb-2">
                              Party Members:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {party.guests.map((guest) => (
                                <Link
                                  key={guest.id}
                                  href={`/${slug}/admin/guests?edit=${guest.id}`}
                                  className="inline-flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-md text-sm hover:bg-secondary transition-colors"
                                >
                                  <span>
                                    {guest.firstName} {guest.lastName}
                                  </span>
                                  {guest.isPlusOne && (
                                    <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded">
                                      +1
                                    </span>
                                  )}
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      guest.rsvpStatus === "yes"
                                        ? "bg-green-100 text-green-800"
                                        : guest.rsvpStatus === "no"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {guest.rsvpStatus === "yes"
                                      ? "Confirmed"
                                      : guest.rsvpStatus === "no"
                                        ? "Declined"
                                        : "Pending"}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No parties found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing page {currentPage + 1} of {Math.max(table.getPageCount(), 1)}{" "}
          ({table.getFilteredRowModel().rows.length} parties total)
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

      {/* Edit Party Sheet */}
      {editingParty && (
        <EditPartySheet
          party={editingParty}
          otherParties={initialParties.filter((p) => p.id !== editingParty.id)}
          onClose={closeEditSheet}
        />
      )}

      {/* Single Merge Dialog */}
      <Dialog
        open={mergeDialog.open}
        onOpenChange={(open) =>
          !open &&
          setMergeDialog({ open: false, sourceParty: null, targetPartyId: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Party</DialogTitle>
            <DialogDescription>
              Merge "{mergeDialog.sourceParty?.inviteCode}" into another party.
              All guests will be moved to the target party.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label
              htmlFor="merge-target"
              className="text-sm font-medium text-foreground"
            >
              Select Target Party
            </label>
            <select
              id="merge-target"
              className="w-full mt-2 p-2 border border-border rounded-md bg-background"
              value={mergeDialog.targetPartyId}
              onChange={(e) =>
                setMergeDialog((prev) => ({
                  ...prev,
                  targetPartyId: e.target.value,
                }))
              }
            >
              <option value="">Select a party...</option>
              {initialParties
                .filter((p) => p.id !== mergeDialog.sourceParty?.id)
                .map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.inviteCode} -{" "}
                    {party.name ||
                      party.guests.map((g) => g.firstName).join(", ")}{" "}
                    ({party.guestCount} guests)
                  </option>
                ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setMergeDialog({
                  open: false,
                  sourceParty: null,
                  targetPartyId: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={!mergeDialog.targetPartyId || isPending}
            >
              {isPending ? "Merging..." : "Merge Parties"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ open: false, party: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete party "
              {deleteDialog.party?.inviteCode}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, party: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog
        open={bulkDeleteDialog}
        onOpenChange={(open) => !open && setBulkDeleteDialog(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Parties</DialogTitle>
            <DialogDescription>
              Only empty parties (no guests) can be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {emptySelectedParties.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Will be deleted ({emptySelectedParties.length}):
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {emptySelectedParties.map((p) => (
                    <li key={p.id} className="font-mono">
                      {p.inviteCode}
                      {p.name ? ` — ${p.name}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {nonEmptySelectedParties.length > 0 && (
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">
                  Will be skipped — have guests (
                  {nonEmptySelectedParties.length}
                  ):
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {nonEmptySelectedParties.map((p) => (
                    <li key={p.id} className="font-mono">
                      {p.inviteCode}
                      {p.name ? ` — ${p.name}` : ""} ({p.guestCount} guests)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {emptySelectedParties.length === 0 && (
              <p className="text-sm text-muted-foreground">
                None of the selected parties are empty. Nothing will be deleted.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isPending || emptySelectedParties.length === 0}
            >
              {isPending
                ? "Deleting..."
                : `Delete ${emptySelectedParties.length} Party(ies)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Merge Dialog */}
      <Dialog
        open={bulkMergeDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBulkMergeDialog(false);
            setBulkMergeTargetId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Selected Parties</DialogTitle>
            <DialogDescription>
              Choose which party to keep. All guests from the other selected
              parties will be moved into the target, and those parties will be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {selectedPartyObjects.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  bulkMergeTargetId === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }`}
              >
                <input
                  type="radio"
                  name="merge-target"
                  value={p.id}
                  checked={bulkMergeTargetId === p.id}
                  onChange={(e) => setBulkMergeTargetId(e.target.value)}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm bg-secondary px-2 py-0.5 rounded">
                    {p.inviteCode}
                  </span>
                  {p.name && (
                    <span className="ml-2 text-sm font-medium">{p.name}</span>
                  )}
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({p.guestCount} guests)
                  </span>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkMergeDialog(false);
                setBulkMergeTargetId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkMerge}
              disabled={!bulkMergeTargetId || isPending}
            >
              {isPending
                ? "Merging..."
                : `Merge into ${bulkMergeTargetId ? initialParties.find((p) => p.id === bulkMergeTargetId)?.inviteCode : "..."}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
