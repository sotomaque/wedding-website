"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Merge,
  MoreHorizontal,
  Trash2,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import type { PartyWithGuests } from "./actions";
import { deleteParty, mergeParties, updateParty } from "./actions";
import { EditPartySheet } from "./edit-party-sheet";
import { PartiesFilters } from "./parties-filters";

const PAGE_SIZE = 10;

interface PartiesTableProps {
  initialParties: PartyWithGuests[];
  error: string | null;
}

export function PartiesTable({ initialParties, error }: PartiesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedParties, setExpandedParties] = useState<Set<string>>(
    new Set(),
  );
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean;
    sourceParty: PartyWithGuests | null;
    targetPartyId: string;
  }>({ open: false, sourceParty: null, targetPartyId: "" });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    party: PartyWithGuests | null;
  }>({ open: false, party: null });

  // Pagination
  const currentPage = Number.parseInt(searchParams.get("page") || "0", 10);
  const totalPages = Math.ceil(initialParties.length / PAGE_SIZE);
  const paginatedParties = initialParties.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  // Get party ID for editing from URL
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
    router.push(`/admin/parties?${params.toString()}`);
  }

  function openEditSheet(partyId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", partyId);
    router.push(`/admin/parties?${params.toString()}`, { scroll: false });
  }

  function closeEditSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.push(`/admin/parties?${params.toString()}`, { scroll: false });
  }

  const toggleExpanded = (partyId: string) => {
    setExpandedParties((prev) => {
      const next = new Set(prev);
      if (next.has(partyId)) {
        next.delete(partyId);
      } else {
        next.add(partyId);
      }
      return next;
    });
  };

  const startEditingName = (party: PartyWithGuests) => {
    setEditingNameId(party.id);
    setEditingNameValue(party.name || "");
  };

  const cancelEditingName = () => {
    setEditingNameId(null);
    setEditingNameValue("");
  };

  const savePartyName = async (partyId: string) => {
    startTransition(async () => {
      const result = await updateParty(partyId, {
        name: editingNameValue.trim() || null,
      });

      if (result.success) {
        toast.success("Party name updated");
        setEditingNameId(null);
        setEditingNameValue("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update party name");
      }
    });
  };

  const handleMerge = async () => {
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
  };

  const handleDelete = async () => {
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
  };

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
            <Link href="/admin/guests">
              <UsersRound className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link href="/admin/guests">
              <UsersRound className="h-4 w-4 mr-2" />
              Guests
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <PartiesFilters />
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground w-8" />
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Invite Code
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Party Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Guests
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Side
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                List
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Size
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedParties.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No parties found
                </td>
              </tr>
            ) : (
              paginatedParties.map((party) => {
                const isExpanded = expandedParties.has(party.id);
                const isEditingName = editingNameId === party.id;
                return (
                  <Fragment key={party.id}>
                    <tr className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        {party.guestCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(party.id)}
                            className="p-1 hover:bg-secondary rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">
                          {party.invite_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingNameValue}
                              onChange={(e) =>
                                setEditingNameValue(e.target.value)
                              }
                              placeholder="Party name..."
                              className="h-8 w-40"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  savePartyName(party.id);
                                } else if (e.key === "Escape") {
                                  cancelEditingName();
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => savePartyName(party.id)}
                              disabled={isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={cancelEditingName}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingName(party)}
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
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground text-sm">
                          {party.guests
                            .slice(0, 2)
                            .map((g) => g.first_name)
                            .join(", ")}
                          {party.guestCount > 2 && ` +${party.guestCount - 2}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm capitalize">
                          {party.side || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold uppercase">
                          {party.list || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          {party.guestCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditSheet(party.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Party
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setMergeDialog({
                                  open: true,
                                  sourceParty: party,
                                  targetPartyId: "",
                                })
                              }
                            >
                              <Merge className="h-4 w-4 mr-2" />
                              Merge Into...
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setDeleteDialog({ open: true, party })
                              }
                              disabled={party.guestCount > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Party
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    {isExpanded && party.guests.length > 0 && (
                      <tr
                        key={`${party.id}-guests`}
                        className="bg-secondary/20"
                      >
                        <td colSpan={8} className="px-4 py-3">
                          <div className="pl-8">
                            <p className="text-xs text-muted-foreground mb-2">
                              Party Members:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {party.guests.map((guest) => (
                                <Link
                                  key={guest.id}
                                  href={`/admin/guests?edit=${guest.id}`}
                                  className="inline-flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-md text-sm hover:bg-secondary transition-colors"
                                >
                                  <span>
                                    {guest.first_name} {guest.last_name}
                                  </span>
                                  {guest.is_plus_one && (
                                    <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded">
                                      +1
                                    </span>
                                  )}
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      guest.rsvp_status === "yes"
                                        ? "bg-green-100 text-green-800"
                                        : guest.rsvp_status === "no"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {guest.rsvp_status === "yes"
                                      ? "Confirmed"
                                      : guest.rsvp_status === "no"
                                        ? "Declined"
                                        : "Pending"}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing page {currentPage + 1} of {totalPages} (
            {initialParties.length} parties total)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Party Sheet */}
      {editingParty && (
        <EditPartySheet
          party={editingParty}
          otherParties={initialParties.filter((p) => p.id !== editingParty.id)}
          onClose={closeEditSheet}
        />
      )}

      {/* Merge Dialog */}
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
              Merge "{mergeDialog.sourceParty?.invite_code}" into another party.
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
                    {party.invite_code} -{" "}
                    {party.name ||
                      party.guests.map((g) => g.first_name).join(", ")}{" "}
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

      {/* Delete Dialog */}
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
              {deleteDialog.party?.invite_code}"? This action cannot be undone.
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
    </div>
  );
}
