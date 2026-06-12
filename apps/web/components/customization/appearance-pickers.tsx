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
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTemplate } from "@/app/[slug]/admin/settings/actions";
import {
  getPhotoSections,
  getTemplatePreset,
  type PhotoSectionKey,
  TEMPLATE_PRESETS,
} from "@/lib/templates";
import { getThemePreset } from "@/lib/themes";

// Theme / Font / Branding cards are shared verbatim with the Settings page —
// see appearance-option-grids.tsx. Re-exported here under the names the inline
// customizer imports so its call sites are unchanged.
export {
  BrandingAppearancePicker as BrandingPicker,
  FontAppearancePicker as FontPicker,
  ThemeAppearancePicker as ThemePicker,
} from "./appearance-option-grids";

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
