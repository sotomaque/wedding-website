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
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ArrowRight, MoreHorizontal, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { PartyWithGuests } from "../actions";
import { createPartyFromGuests, moveGuestToParty } from "../actions";

interface PartyGuestsListProps {
  party: PartyWithGuests;
  otherParties: PartyWithGuests[];
}

export function PartyGuestsList({ party, otherParties }: PartyGuestsListProps) {
  const router = useRouter();
  const slug = useWeddingSlug();
  const [isPending, startTransition] = useTransition();
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    guestId: string | null;
    guestName: string;
    targetPartyId: string;
  }>({ open: false, guestId: null, guestName: "", targetPartyId: "" });
  const [splitDialog, setSplitDialog] = useState<{
    open: boolean;
    guestId: string | null;
    guestName: string;
  }>({ open: false, guestId: null, guestName: "" });

  const handleMove = async () => {
    const guestId = moveDialog.guestId;
    if (!guestId || !moveDialog.targetPartyId) return;

    startTransition(async () => {
      const result = await moveGuestToParty(guestId, moveDialog.targetPartyId);

      if (result.success) {
        toast.success("Guest moved successfully");
        setMoveDialog({
          open: false,
          guestId: null,
          guestName: "",
          targetPartyId: "",
        });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to move guest");
      }
    });
  };

  const handleSplit = async () => {
    const guestId = splitDialog.guestId;
    if (!guestId) return;

    startTransition(async () => {
      const result = await createPartyFromGuests([guestId]);

      if (result.success) {
        toast.success("Guest moved to new party");
        setSplitDialog({ open: false, guestId: null, guestName: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create new party");
      }
    });
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-foreground mb-4">
        Party Members ({party.guestCount})
      </h2>

      {party.guests.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">
          No guests in this party.
        </p>
      ) : (
        <div className="space-y-2">
          {party.guests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3">
                <div>
                  <Link
                    href={`/${slug}/admin/guests?edit=${guest.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {guest.firstName} {guest.lastName}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    {guest.isPlusOne && (
                      <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded">
                        +1
                      </span>
                    )}
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        guest.rsvpStatus === "yes"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : guest.rsvpStatus === "no"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {guest.rsvpStatus === "yes"
                        ? "Confirmed"
                        : guest.rsvpStatus === "no"
                          ? "Declined"
                          : "Pending"}
                    </span>
                    {guest.email && (
                      <span className="text-xs text-muted-foreground">
                        {guest.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      setMoveDialog({
                        open: true,
                        guestId: guest.id,
                        guestName:
                          `${guest.firstName} ${guest.lastName || ""}`.trim(),
                        targetPartyId: "",
                      })
                    }
                    disabled={otherParties.length === 0}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Move to Another Party
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setSplitDialog({
                        open: true,
                        guestId: guest.id,
                        guestName:
                          `${guest.firstName} ${guest.lastName || ""}`.trim(),
                      })
                    }
                    disabled={party.guestCount <= 1}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Split to New Party
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Move Dialog */}
      <Dialog
        open={moveDialog.open}
        onOpenChange={(open) =>
          !open &&
          setMoveDialog({
            open: false,
            guestId: null,
            guestName: "",
            targetPartyId: "",
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Guest</DialogTitle>
            <DialogDescription>
              Move "{moveDialog.guestName}" to another party.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label
              htmlFor="move-target-party"
              className="text-sm font-medium text-foreground"
            >
              Select Target Party
            </label>
            <select
              id="move-target-party"
              className="w-full mt-2 p-2 border border-border rounded-md bg-background"
              value={moveDialog.targetPartyId}
              onChange={(e) =>
                setMoveDialog((prev) => ({
                  ...prev,
                  targetPartyId: e.target.value,
                }))
              }
            >
              <option value="">Select a party...</option>
              {otherParties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.inviteCode} -{" "}
                  {p.name || p.guests.map((g) => g.firstName).join(", ")} (
                  {p.guestCount} guests)
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setMoveDialog({
                  open: false,
                  guestId: null,
                  guestName: "",
                  targetPartyId: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={!moveDialog.targetPartyId || isPending}
            >
              {isPending ? "Moving..." : "Move Guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Dialog */}
      <Dialog
        open={splitDialog.open}
        onOpenChange={(open) =>
          !open && setSplitDialog({ open: false, guestId: null, guestName: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split to New Party</DialogTitle>
            <DialogDescription>
              Create a new party for "{splitDialog.guestName}" with their own
              invite code.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setSplitDialog({ open: false, guestId: null, guestName: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleSplit} disabled={isPending}>
              {isPending ? "Creating..." : "Create New Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
