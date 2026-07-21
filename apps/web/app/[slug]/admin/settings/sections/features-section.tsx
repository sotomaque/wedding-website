"use client";

import type { Wedding } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { featureTogglesSchema } from "@/lib/validations/wedding-content";
import { updateFeatureToggles } from "../actions";

const FEATURE_LABELS: Record<string, string> = {
  hotels: "Hotels",
  vendors: "Vendors",
  itinerary: "Itinerary",
  thingsToDo: "Things to Do",
  tripPlanner: "Trip Planner",
  registry: "Registry",
  guestPhotos: "Guest Photos",
  slideshow: "Slideshow",
};

export function FeaturesSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  // Parse the JSON blob via the same schema the rest of the app uses, so
  // unknown keys are stripped and missing ones get their declared defaults
  // instead of trusting an unchecked `as Record<string, boolean>` cast.
  const initialToggles = featureTogglesSchema.parse(
    wedding.featureToggles ?? {},
  ) as Record<string, boolean>;
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const key of Object.keys(FEATURE_LABELS)) {
      defaults[key] = initialToggles[key] ?? true;
    }
    return defaults;
  });

  function handleToggle(key: string, checked: boolean) {
    setToggles((prev) => ({ ...prev, [key]: checked }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateFeatureToggles(toggles);
      if (result.success) {
        toast.success("Feature toggles saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Toggle features on or off for your wedding site.
      </p>
      {Object.entries(FEATURE_LABELS).map(([key, label]) => (
        <div
          key={key}
          className="flex items-center justify-between py-2 border-b border-border last:border-0"
        >
          <Label htmlFor={`feature-${key}`} className="cursor-pointer">
            {label}
          </Label>
          <Switch
            id={`feature-${key}`}
            checked={toggles[key] ?? true}
            onCheckedChange={(checked) => handleToggle(key, checked)}
          />
        </div>
      ))}
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Feature Toggles"}
      </Button>
    </div>
  );
}
