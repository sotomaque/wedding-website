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
  Gift as GiftIcon,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import { createColumns } from "./columns";
import { GiftsFilters } from "./gifts-filters";

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

interface GiftStats {
  baby_fund: { total: number; count: number };
  honeymoon: { total: number; count: number };
  student_loans: { total: number; count: number };
  unknown: { total: number; count: number };
  grand_total: number;
  total_count: number;
}

type SortableColumn =
  | "createdAt"
  | "amountCents"
  | "donorName"
  | "giftType"
  | "status";

interface GiftsTableProps {
  initialGifts: Gift[];
  stats: GiftStats;
  error?: string | null;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function GiftsTable({ initialGifts, stats, error }: GiftsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = useWeddingSlug();

  const currentSortBy = searchParams.get("sortBy") || undefined;
  const currentSortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
  const currentPage = Number.parseInt(searchParams.get("page") || "0", 10);

  const hasActiveUrlFilters =
    searchParams.get("giftType") ||
    searchParams.get("status") ||
    searchParams.get("thankYouSent") ||
    searchParams.get("hasGuest");
  const hasActiveColumnFilters = columnFilters.length > 0;
  const hasActiveFilters = hasActiveUrlFilters || hasActiveColumnFilters;

  function handleEdit(giftId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", giftId);
    router.push(`/admin/gifts?${params.toString()}`, { scroll: false });
  }

  async function handleUpdateNotes(giftId: string, notes: string) {
    const response = await fetch("/api/admin/gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: giftId, notes }),
    });

    if (!response.ok) {
      throw new Error("Failed to update notes");
    }

    router.refresh();
  }

  function handleSort(column: SortableColumn) {
    const params = new URLSearchParams(searchParams.toString());

    let newSortOrder: "asc" | "desc" | null = "asc";

    if (currentSortBy === column) {
      if (currentSortOrder === "asc") {
        newSortOrder = "desc";
      } else if (currentSortOrder === "desc") {
        params.delete("sortBy");
        params.delete("sortOrder");
        router.push(`/${slug}/admin/gifts?${params.toString()}`);
        return;
      }
    }

    params.set("sortBy", column);
    params.set("sortOrder", newSortOrder);
    router.push(`/${slug}/admin/gifts?${params.toString()}`);
  }

  function handlePageChange(newPageIndex: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (newPageIndex === 0) {
      params.delete("page");
    } else {
      params.set("page", newPageIndex.toString());
    }

    router.push(`/${slug}/admin/gifts?${params.toString()}`);
  }

  function clearFilters() {
    router.push(`/${slug}/admin/gifts`);
  }

  const columns = createColumns({
    currentSortBy,
    currentSortOrder,
    onSort: handleSort,
    onEdit: handleEdit,
    onUpdateNotes: handleUpdateNotes,
  });

  const table = useReactTable({
    data: initialGifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
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

  function refreshGifts() {
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">
            Gift Registry
          </h1>
          <p className="text-muted-foreground">
            Track donations and contributions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshGifts}
            className="md:hidden"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={refreshGifts}
            className="hidden md:flex"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-pink-50 dark:bg-pink-950 rounded-lg p-4 border border-pink-200 dark:border-pink-800">
          <p className="text-sm text-pink-600 dark:text-pink-400 font-medium">
            Baby Fund
          </p>
          <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">
            {formatCurrency(stats.baby_fund.total)}
          </p>
          <p className="text-xs text-pink-500 dark:text-pink-400">
            {stats.baby_fund.count} gift(s)
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            Honeymoon
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(stats.honeymoon.total)}
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400">
            {stats.honeymoon.count} gift(s)
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
            Student Loans
          </p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {formatCurrency(stats.student_loans.total)}
          </p>
          <p className="text-xs text-purple-500 dark:text-purple-400">
            {stats.student_loans.count} gift(s)
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Total Raised
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {formatCurrency(stats.grand_total)}
          </p>
          <p className="text-xs text-green-500 dark:text-green-400">
            {stats.total_count} gift(s)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex gap-4">
          <Input
            placeholder="Filter by donor name..."
            value={
              (table.getColumn("donorName")?.getFilterValue() as string) ?? ""
            }
            onChange={(e) =>
              table.getColumn("donorName")?.setFilterValue(e.target.value)
            }
            className="max-w-sm"
          />
        </div>

        <GiftsFilters />
      </div>

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
                        <EmptyTitle>Failed to load gifts</EmptyTitle>
                        <EmptyDescription>{error}</EmptyDescription>
                      </EmptyHeader>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshGifts}
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
                        <EmptyTitle>No gifts match your filters</EmptyTitle>
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
                          <GiftIcon />
                        </EmptyMedia>
                        <EmptyTitle>No gifts yet</EmptyTitle>
                        <EmptyDescription>
                          Gifts will appear here once donors contribute through
                          your registry
                        </EmptyDescription>
                      </EmptyHeader>
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
          {table.getFilteredRowModel().rows.length} gift(s) total)
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
    </>
  );
}
