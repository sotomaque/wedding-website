"use client";

import type { Wedding } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updateBrandingSettings,
  updateFont,
  updateTheme,
} from "@/app/[slug]/admin/settings/actions";
import { FONT_PAIRINGS } from "@/lib/fonts";
import {
  getEffectiveFontId,
  getEffectiveThemeId,
  getTemplatePreset,
} from "@/lib/templates";
import { THEME_PRESETS } from "@/lib/themes";
import { designConfigSchema } from "@/lib/validations/wedding-content";

/**
 * Shared appearance-card grids consumed by BOTH the standalone Settings page
 * (`appearance-sections.tsx`) and the inline customizer (`appearance-pickers.tsx`).
 * The two surfaces rendered byte-identical Theme / Typography / Branding cards;
 * keeping them here means the resolve-on-read "Active" highlight (the bug that
 * prompted this) can only ever be fixed in one place. Template selection is NOT
 * shared — the customizer adds a photo-section confirmation dialog the Settings
 * page doesn't — so it stays defined per surface.
 */

/** Color-theme card grid. The active card resolves user override → template default. */
export function ThemeAppearancePicker({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentThemeId = getEffectiveThemeId(
    getTemplatePreset(wedding.templateId),
    wedding.themeId as string | null,
  );

  function handleSelect(themeId: string) {
    startTransition(async () => {
      const result = await updateTheme(themeId);
      if (result.success) {
        toast.success("Theme updated");
      } else {
        toast.error(result.error ?? "Failed to update theme");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Choose a color theme for your wedding site. The theme affects all
        public-facing pages.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEME_PRESETS.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => handleSelect(theme.id)}
            disabled={isPending}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              currentThemeId === theme.id
                ? "border-accent shadow-md"
                : "border-border hover:border-accent/40"
            }`}
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
              {currentThemeId === theme.id && (
                <span className="text-xs font-medium text-accent">Active</span>
              )}
            </div>
            <p className="text-sm font-medium">{theme.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {theme.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Font-pairing card grid. The active card resolves user override → template default. */
export function FontAppearancePicker({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const design = designConfigSchema.parse(wedding.designConfig ?? {});
  const currentFontId = getEffectiveFontId(
    getTemplatePreset(wedding.templateId),
    design.fontId,
  );

  function handleSelect(fontId: string) {
    startTransition(async () => {
      const result = await updateFont(fontId);
      if (result.success) {
        toast.success("Font updated");
      } else {
        toast.error(result.error ?? "Failed to update font");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Choose a font pairing for your wedding site. Headings and body text
        update across all public-facing pages.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FONT_PAIRINGS.map((font) => (
          <button
            key={font.id}
            type="button"
            onClick={() => handleSelect(font.id)}
            disabled={isPending}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              currentFontId === font.id
                ? "border-accent shadow-md"
                : "border-border hover:border-accent/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{font.name}</p>
              {currentFontId === font.id && (
                <span className="text-xs font-medium text-accent">Active</span>
              )}
            </div>
            <p
              className="text-xl leading-tight"
              style={{ fontFamily: font.preview.heading }}
            >
              Aa
            </p>
            <p
              className="text-sm mt-1"
              style={{ fontFamily: font.preview.body }}
            >
              The quick brown fox
            </p>
            <p
              className="text-xs text-muted-foreground mt-2"
              // Pin to this option's own body font. Without it the description
              // inherits the live --font-body override (the customizer renders
              // inside the public font-styled scope), so every card's text
              // would re-render in whichever font is currently selected.
              style={{ fontFamily: font.preview.body }}
            >
              {font.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Brand image URL + alt-text form with a live preview. */
export function BrandingAppearancePicker({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const [brandImageUrl, setBrandImageUrl] = useState(
    wedding.brandImageUrl ?? "",
  );
  const [brandImageAlt, setBrandImageAlt] = useState(
    wedding.brandImageAlt ?? "",
  );

  function handleSave() {
    startTransition(async () => {
      const result = await updateBrandingSettings({
        brandImageUrl,
        brandImageAlt,
      });
      if (result.success) {
        toast.success("Branding settings saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="brandImageUrl">Brand Image URL</Label>
        <Input
          id="brandImageUrl"
          value={brandImageUrl}
          onChange={(e) => setBrandImageUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="brandImageAlt">Brand Image Alt Text</Label>
        <Input
          id="brandImageAlt"
          value={brandImageAlt}
          onChange={(e) => setBrandImageAlt(e.target.value)}
          placeholder="Our wedding logo"
          className="mt-1"
        />
      </div>
      {brandImageUrl && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          {/* biome-ignore lint/performance/noImgElement: dynamic brand image URL, not optimizable by next/image */}
          <img
            src={brandImageUrl}
            alt={brandImageAlt || "Brand image preview"}
            className="max-h-32 rounded border border-border"
          />
        </div>
      )}
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Branding Settings"}
      </Button>
    </div>
  );
}
