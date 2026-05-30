"use client";

import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Switch } from "@workspace/ui/components/switch";
import { Settings2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { DashboardConfig } from "@/lib/validations/wedding-content";
import { updateDashboardConfig } from "./settings/actions";

const EXCLUSION_OPTIONS: {
  key: keyof DashboardConfig;
  label: string;
  description: string;
}[] = [
  {
    key: "excludeThreeAndUnder",
    label: "Exclude 3 & under",
    description: "Don't count guests aged 3 and under",
  },
  {
    key: "excludeUnder21",
    label: "Exclude under 21",
    description: "Don't count guests under 21",
  },
  {
    key: "excludePlusOnes",
    label: "Exclude plus-ones",
    description: "Don't count plus-one guests",
  },
];

export function DashboardConfigPanel({ config }: { config: DashboardConfig }) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<DashboardConfig>(config);
  const [open, setOpen] = useState(false);

  const hasChanges =
    values.excludeThreeAndUnder !== config.excludeThreeAndUnder ||
    values.excludeUnder21 !== config.excludeUnder21 ||
    values.excludePlusOnes !== config.excludePlusOnes;

  function handleSave() {
    startTransition(async () => {
      const result = await updateDashboardConfig(values);
      if (result.success) {
        toast.success("RSVP count settings saved");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Customize RSVP Count
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-foreground">
              RSVP Count Criteria
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Choose which guests to exclude from your RSVP totals.
            </p>
          </div>
          {EXCLUSION_OPTIONS.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <Label
                  htmlFor={`exclusion-${option.key}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <Switch
                id={`exclusion-${option.key}`}
                checked={values[option.key]}
                onCheckedChange={(checked) =>
                  setValues((prev) => ({ ...prev, [option.key]: checked }))
                }
              />
            </div>
          ))}
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            size="sm"
            className="w-full"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
