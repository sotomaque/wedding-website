"use client";

import type { Wedding } from "@prisma/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updateBrandingSettings,
  updateFont,
  updateTemplate,
  updateTheme,
} from "@/app/[slug]/admin/settings/actions";
import { FONT_PAIRINGS } from "@/lib/fonts";
import {
  getPhotoSections,
  getTemplatePreset,
  type PhotoSectionKey,
  TEMPLATE_PRESETS,
} from "@/lib/templates";
import { getThemePreset, THEME_PRESETS } from "@/lib/themes";
import { designConfigSchema } from "@/lib/validations/wedding-content";

/** Human labels for photo-consuming sections, used in the switch warning. */
const PHOTO_SECTION_LABELS: Record<PhotoSectionKey, string> = {
  hero: "Hero",
  story: "Our Story",
  gallery: "Gallery",
};

function listSections(sections: PhotoSectionKey[]): string {
  const labels = sections.map((s) => PHOTO_SECTION_LABELS[s]);
  if (labels.length <= 1) return labels.join("");
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

export function BrandingPicker({ wedding }: { wedding: Wedding }) {
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

export function ThemePicker({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentThemeId = (wedding.themeId as string) ?? "warm-gold";

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

export function FontPicker({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const design = designConfigSchema.parse(wedding.designConfig ?? {});
  const currentFontId = design.fontId ?? "classic";

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
            <p className="text-xs text-muted-foreground mt-2">
              {font.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Top-level Appearance control. A template bundles layout + motif +
 * default theme + default font into one pickable unit. Picking a template
 * sets only `Wedding.templateId`; any custom color theme / font pairing the
 * user has selected is preserved (additive — see actions.ts `updateTemplate`).
 */
export function TemplatePicker({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentTemplateId = wedding.templateId ?? "classic";
  // When switching changes which sections display photos, hold the pick here
  // and confirm with the user before applying (placements are never deleted —
  // only which ones render changes).
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(
    null,
  );

  function applyTemplate(templateId: string) {
    startTransition(async () => {
      const result = await updateTemplate(templateId);
      if (result.success) {
        toast.success("Template updated");
      } else {
        toast.error(result.error ?? "Failed to update template");
      }
    });
  }

  function handleSelect(templateId: string) {
    if (templateId === currentTemplateId) return;

    const currentSections = getPhotoSections(
      getTemplatePreset(currentTemplateId),
    );
    const nextSections = getPhotoSections(getTemplatePreset(templateId));
    const removed = currentSections.filter((s) => !nextSections.includes(s));
    const added = nextSections.filter((s) => !currentSections.includes(s));

    // Only interrupt when the photo-bearing sections actually change.
    if (removed.length === 0 && added.length === 0) {
      applyTemplate(templateId);
      return;
    }
    setPendingTemplateId(templateId);
  }

  const pendingDiff = (() => {
    if (!pendingTemplateId) return null;
    const currentSections = getPhotoSections(
      getTemplatePreset(currentTemplateId),
    );
    const nextSections = getPhotoSections(getTemplatePreset(pendingTemplateId));
    return {
      name: getTemplatePreset(pendingTemplateId).name,
      removed: currentSections.filter((s) => !nextSections.includes(s)),
      added: nextSections.filter((s) => !currentSections.includes(s)),
    };
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Pick a template to set the overall look of your wedding site — section
        order, decorative dividers, and the default colors and fonts. After
        picking a template you can fine-tune the color theme and typography
        below; your customizations are preserved if you switch templates later.
      </p>
      <AlertDialog
        open={pendingTemplateId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTemplateId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switching to {pendingDiff?.name} changes where your photos appear
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDiff && pendingDiff.removed.length > 0 && (
                <>
                  Photos in your {listSections(pendingDiff.removed)} section
                  {pendingDiff.removed.length > 1 ? "s" : ""} will no longer be
                  shown.{" "}
                </>
              )}
              {pendingDiff && pendingDiff.added.length > 0 && (
                <>
                  You'll be able to add photos to the{" "}
                  {listSections(pendingDiff.added)} section
                  {pendingDiff.added.length > 1 ? "s" : ""}.{" "}
                </>
              )}
              Your photo assignments are saved either way and return if you
              switch back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingTemplateId) applyTemplate(pendingTemplateId);
                setPendingTemplateId(null);
              }}
            >
              Switch template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TEMPLATE_PRESETS.map((template) => {
          const defaultTheme = getThemePreset(template.defaultThemeId);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template.id)}
              disabled={isPending}
              className={`text-left p-4 rounded-lg border-2 transition-all ${
                currentTemplateId === template.id
                  ? "border-accent shadow-md"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">{template.name}</p>
                {currentTemplateId === template.id && (
                  <span className="text-xs font-medium text-accent">
                    Active
                  </span>
                )}
              </div>
              <div className="flex gap-1 mb-3">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{
                    backgroundColor: defaultTheme.preview.background,
                  }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: defaultTheme.preview.primary }}
                />
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: defaultTheme.preview.accent }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {template.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
