"use client";

import type { Wedding } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  guestListValues,
  headcountConfigSchema,
} from "@/lib/validations/wedding-content";
import { updateHeadcountConfig } from "../actions";

const GUEST_LIST_LABELS: Record<(typeof guestListValues)[number], string> = {
  a: "A-List",
  b: "B-List",
  c: "C-List",
};

export function HeadcountSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  // Parse via the shared schema so unknown keys are stripped and missing ones
  // resolve to the "count every accepted guest" defaults.
  const initial = headcountConfigSchema.parse(wedding.headcountConfig ?? {});
  const [label, setLabel] = useState(initial.label);
  const [includedLists, setIncludedLists] = useState<
    (typeof guestListValues)[number][]
  >(initial.includedLists);
  const [excludeThreeAndUnder, setExcludeThreeAndUnder] = useState(
    initial.excludeThreeAndUnder,
  );
  const [excludeUnder21, setExcludeUnder21] = useState(initial.excludeUnder21);

  function toggleList(
    list: (typeof guestListValues)[number],
    checked: boolean,
  ) {
    setIncludedLists((prev) => {
      if (checked) {
        // Preserve canonical a/b/c order regardless of toggle sequence.
        return guestListValues.filter((l) => prev.includes(l) || l === list);
      }
      return prev.filter((l) => l !== list);
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateHeadcountConfig({
        label,
        includedLists,
        excludeThreeAndUnder,
        excludeUnder21,
      });
      if (result.success) {
        toast.success("Headcount criteria saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Define which guests count toward the headcount shown on your dashboard.
        The stat always counts guests who accepted their RSVP — these criteria
        narrow it further (for example, excluding children who don&apos;t count
        toward your venue limit).
      </p>

      <div className="space-y-2">
        <Label htmlFor="headcount-label">Card label</Label>
        <Input
          id="headcount-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Accepted RSVPs"
        />
        <p className="text-xs text-muted-foreground">
          The heading shown above the number on your dashboard.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Guest lists to count</h3>
        {guestListValues.map((list) => (
          <div
            key={list}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <Label
              htmlFor={`headcount-list-${list}`}
              className="cursor-pointer"
            >
              {GUEST_LIST_LABELS[list]}
            </Label>
            <Switch
              id={`headcount-list-${list}`}
              checked={includedLists.includes(list)}
              onCheckedChange={(checked) => toggleList(list, checked)}
            />
          </div>
        ))}
        {includedLists.length === 0 && (
          <p className="text-xs text-destructive">
            No lists selected — the headcount will be zero.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Exclusions</h3>
        <div className="flex items-center justify-between py-2 border-b border-border">
          <Label htmlFor="headcount-three-and-under" className="cursor-pointer">
            Exclude children 3 &amp; under
          </Label>
          <Switch
            id="headcount-three-and-under"
            checked={excludeThreeAndUnder}
            onCheckedChange={setExcludeThreeAndUnder}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
          <Label htmlFor="headcount-under-21" className="cursor-pointer">
            Exclude guests under 21
          </Label>
          <Switch
            id="headcount-under-21"
            checked={excludeUnder21}
            onCheckedChange={setExcludeUnder21}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Headcount Criteria"}
      </Button>
    </div>
  );
}
