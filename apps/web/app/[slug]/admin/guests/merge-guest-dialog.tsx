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
import { Input } from "@workspace/ui/components/input";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TargetGuest {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  inviteCode: string | null;
  selfRegistered: boolean;
}

interface MergeGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Guests to fold into the chosen target, then delete. */
  sourceIds: string[];
  /** Short label for the source(s), e.g. a name or "3 guests". */
  sourceLabel: string;
  onMerged: () => void;
}

export function MergeGuestDialog({
  open,
  onOpenChange,
  sourceIds,
  sourceLabel,
  onMerged,
}: MergeGuestDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TargetGuest[]>([]);
  const [selected, setSelected] = useState<TargetGuest | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Reset state whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(null);
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const exclude =
          sourceIds.length === 1 ? `&exclude=${sourceIds[0]}` : "";
        const res = await fetch(
          `/api/admin/guests/search?q=${encodeURIComponent(query.trim())}${exclude}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        const sourceSet = new Set(sourceIds);
        setResults(
          (data.guests ?? []).filter((g: TargetGuest) => !sourceSet.has(g.id)),
        );
      } catch {
        // Aborted or failed — ignore; the next keystroke retries.
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, sourceIds]);

  async function handleMerge() {
    if (!selected) return;
    setIsMerging(true);
    try {
      let merged = 0;
      for (const sourceId of sourceIds) {
        const res = await fetch(`/api/admin/guests/${sourceId}/merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetGuestId: selected.id }),
        });
        if (res.ok) merged += 1;
      }
      if (merged === sourceIds.length) {
        toast.success(
          merged === 1
            ? "Guest merged"
            : `${merged} guests merged into ${selected.firstName}`,
        );
      } else {
        toast.warning(`Merged ${merged} of ${sourceIds.length} guests`);
      }
      onOpenChange(false);
      onMerged();
    } catch {
      toast.error("Failed to merge");
    } finally {
      setIsMerging(false);
    }
  }

  function fullName(g: TargetGuest) {
    return `${g.firstName} ${g.lastName ?? ""}`.trim();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge {sourceLabel}</DialogTitle>
          <DialogDescription>
            Search for the existing guest to merge {sourceLabel} into. Their
            event RSVPs, plus-ones, and gifts move over, then the
            self-registered record is removed.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or invite code…"
        />

        <div className="max-h-64 overflow-y-auto -mx-1">
          {query.trim().length >= 2 && results.length === 0 ? (
            <p className="px-1 py-3 text-sm text-muted-foreground">
              No matching guests.
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(g)}
                    className={`w-full flex items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm ${
                      selected?.id === g.id
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-secondary border border-transparent"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{fullName(g)}</span>
                      {g.email && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {g.email}
                        </span>
                      )}
                      {g.inviteCode && (
                        <span className="text-muted-foreground font-mono">
                          {" "}
                          · {g.inviteCode}
                        </span>
                      )}
                    </span>
                    {selected?.id === g.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleMerge}
            disabled={!selected || isMerging}
          >
            {isMerging
              ? "Merging…"
              : selected
                ? `Merge into ${selected.firstName}`
                : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
