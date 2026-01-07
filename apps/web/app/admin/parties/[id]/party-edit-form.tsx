"use client";

import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PartyWithGuests } from "../actions";
import { updateParty } from "../actions";

interface PartyEditFormProps {
  party: PartyWithGuests;
}

export function PartyEditForm({ party }: PartyEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: party.name || "",
    side: party.side || "",
    list: party.list || "",
    notes: party.notes || "",
  });

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
      } else {
        toast.error(result.error || "Failed to update party");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="party-name"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Party Name (Optional)
          </label>
          <input
            id="party-name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g., The Smith Family"
            className="w-full p-2 border border-border rounded-md bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            A friendly name for this party group
          </p>
        </div>

        <div>
          <label
            htmlFor="party-side"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Side
          </label>
          <select
            id="party-side"
            value={formData.side}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, side: e.target.value }))
            }
            className="w-full p-2 border border-border rounded-md bg-background"
          >
            <option value="">Not specified</option>
            <option value="bride">Bride</option>
            <option value="groom">Groom</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="party-list"
            className="block text-sm font-medium text-foreground mb-1"
          >
            List
          </label>
          <select
            id="party-list"
            value={formData.list}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, list: e.target.value }))
            }
            className="w-full p-2 border border-border rounded-md bg-background"
          >
            <option value="">Not specified</option>
            <option value="a">A List</option>
            <option value="b">B List</option>
            <option value="c">C List</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="party-notes"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Notes
        </label>
        <textarea
          id="party-notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Any notes about this party..."
          rows={3}
          className="w-full p-2 border border-border rounded-md bg-background resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
