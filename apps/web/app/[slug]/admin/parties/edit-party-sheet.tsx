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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowRight, MoreHorizontal, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useWeddingSlug } from "@/lib/hooks/use-wedding-slug";
import type { PartyWithGuests } from "./actions";
import {
  createPartyFromGuests,
  moveGuestToParty,
  updateParty,
} from "./actions";

interface EditPartySheetProps {
  party: PartyWithGuests;
  otherParties: PartyWithGuests[];
  onClose: () => void;
}

export function EditPartySheet({
  party,
  otherParties,
  onClose,
}: EditPartySheetProps) {
  const router = useRouter();
  const slug = useWeddingSlug();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: party.name || "",
    side: party.side || "",
    list: party.list || "",
    notes: party.notes || "",
  });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateParty(party.id, {
        name: formData.name || null,
        side: (formData.side as "bride" | "groom" | "both") || null,
        list: (formData.list as "a" | "b" | "c") || null,
        notes: formData.notes || null,
      });

      if (result.success) {
        toast.success("Party updated successfully");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Failed to update party");
      }
    });
  };

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
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col h-full">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="text-2xl font-serif">Edit Party</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Invite Code:{" "}
            <span className="font-mono bg-secondary px-2 py-0.5 rounded">
              {party.inviteCode}
            </span>
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 min-h-0">
            {/* Party Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Party Details</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Party Name (Optional)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., The Smith Family"
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name for this party group
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Side</Label>
                  <Select
                    value={formData.side || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        side: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="bride">Bride</SelectItem>
                      <SelectItem value="groom">Groom</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>List</Label>
                  <Select
                    value={formData.list || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        list: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="a">A List</SelectItem>
                      <SelectItem value="b">B List</SelectItem>
                      <SelectItem value="c">C List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Any notes about this party..."
                  rows={3}
                />
              </div>
            </div>

            {/* Party Members */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold">
                Party Members ({party.guestCount})
              </h3>

              {party.guests.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">
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
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="flex-shrink-0 pt-4 border-t bg-background">
            <SheetFooter className="gap-3 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>

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
            <Label htmlFor="move-target">Select Target Party</Label>
            <select
              id="move-target"
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
    </Sheet>
  );
}
