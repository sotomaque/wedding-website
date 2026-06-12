"use client";

import type { Wedding } from "@prisma/client";
import { useTransition } from "react";
import { toast } from "sonner";
import { TEMPLATE_PRESETS } from "@/lib/templates";
import { getThemePreset } from "@/lib/themes";
import { updateTemplate } from "../actions";

// Theme / Typography / Branding cards are shared verbatim with the inline
// customizer — see components/customization/appearance-option-grids.tsx.
// Re-exported here under the names the Settings page imports.
export {
  BrandingAppearancePicker as BrandingSection,
  FontAppearancePicker as TypographySection,
  ThemeAppearancePicker as ThemeSection,
} from "@/components/customization/appearance-option-grids";

/**
 * Top-level Appearance control. A template bundles layout + motif +
 * default theme + default font into one pickable unit. Picking a template
 * sets only `Wedding.templateId`; any custom color theme / font pairing the
 * user has selected is preserved (additive — see actions.ts `updateTemplate`).
 */
export function TemplateSection({ wedding }: { wedding: Wedding }) {
  const [isPending, startTransition] = useTransition();
  const currentTemplateId = wedding.templateId ?? "classic";

  function handleSelect(templateId: string) {
    startTransition(async () => {
      const result = await updateTemplate(templateId);
      if (result.success) {
        toast.success("Template updated");
      } else {
        toast.error(result.error ?? "Failed to update template");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Pick a template to set the overall look of your wedding site — section
        order, decorative dividers, and the default colors and fonts. After
        picking a template you can fine-tune the color theme and typography
        below; your customizations are preserved if you switch templates later.
      </p>
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
