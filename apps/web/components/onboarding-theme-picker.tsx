"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check } from "lucide-react";
import { THEME_PRESETS } from "@/lib/themes";

interface OnboardingThemePickerProps {
  selectedThemeId: string;
  onSelect: (themeId: string) => void;
}

export function OnboardingThemePicker({
  selectedThemeId,
  onSelect,
}: OnboardingThemePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {THEME_PRESETS.map((theme) => {
        const isSelected = selectedThemeId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            className={cn(
              "text-left p-4 rounded-lg border-2 transition-all",
              isSelected
                ? "border-accent shadow-md bg-accent/5"
                : "border-border hover:border-accent/40",
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: theme.preview.background }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: theme.preview.primary }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </div>
              {isSelected && <Check className="h-4 w-4 text-accent" />}
            </div>
            <p className="text-sm font-medium">{theme.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {theme.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
