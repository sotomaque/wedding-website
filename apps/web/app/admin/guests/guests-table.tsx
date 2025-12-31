"use client";

import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Database } from "@/lib/supabase/types";
import { AddGuestForm } from "./add-guest-form";
import { createColumns } from "./columns";
import { GuestsFilters } from "./guests-filters";

type Guest = Database["public"]["Tables"]["guests"]["Row"];
type SortableColumn =
  | "first_name"
  | "email"
  | "side"
  | "list"
  | "rsvp_status"
  | "plus_one_allowed"
  | "family"
  | "notes";

interface GuestsTableProps {
  initialGuests: Guest[];
}

export function GuestsTable({ initialGuests }: GuestsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy") || undefined;
  const currentSortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
  const currentPage = Number.parseInt(searchParams.get("page") || "0", 10);

  const currentSide = searchParams.get("side");
  const currentStatus = searchParams.get("rsvpStatus");
  const hasActiveFilters = currentSide || currentStatus;

  function handleSort(column: SortableColumn) {
    const params = new URLSearchParams(searchParams.toString());

    // Determine new sort order: asc -> desc -> none
    let newSortOrder: "asc" | "desc" | null = "asc";

    if (currentSortBy === column) {
      if (currentSortOrder === "asc") {
        newSortOrder = "desc";
      } else if (currentSortOrder === "desc") {
        // Remove sorting
        params.delete("sortBy");
        params.delete("sortOrder");
        router.push(`/admin/guests?${params.toString()}`);
        return;
      }
    }

    params.set("sortBy", column);
    params.set("sortOrder", newSortOrder);
    router.push(`/admin/guests?${params.toString()}`);
  }

  function handlePageChange(newPageIndex: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (newPageIndex === 0) {
      params.delete("page");
    } else {
      params.set("page", newPageIndex.toString());
    }

    router.push(`/admin/guests?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/admin/guests");
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
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", guestId);
    router.push(`/admin/guests?${params.toString()}`, { scroll: false });
  }

  const columns = createColumns({
    toast,
    onEditGuest: handleEditGuest,
    currentSortBy,
    currentSortOrder,
    onSort: handleSort,
    onUpdateNotes: handleUpdateNotes,
    onUpdateSide: handleUpdateSide,
    onUpdateList: handleUpdateList,
    onUpdateFamily: handleUpdateFamily,
  });

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
    state: {
      sorting,
      columnFilters,
      pagination: {
        pageIndex: currentPage,
        pageSize: 10,
      },
    },
    manualPagination: false,
  });

  async function refreshGuests() {
    // This will trigger a router refresh which will re-fetch server data
    window.location.reload();
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
          <Button variant="outline" onClick={refreshGuests}>
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)}>Add Guest</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex gap-4">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("name")?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
          <Input
            placeholder="Filter by email..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(e) =>
              table.getColumn("email")?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
        </div>

        <GuestsFilters />
      </div>

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
                        onClick={clearFilters}
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
      />
    </>
  );
}
