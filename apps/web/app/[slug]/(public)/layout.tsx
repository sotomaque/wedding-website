import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getWeddingBySlug } from "@/lib/db/wedding-context";
import { generateFontCss, getFontPairing } from "@/lib/fonts";
import { getTemplatePreset } from "@/lib/templates";
import { generateThemeCss, getThemePreset } from "@/lib/themes";
import { designConfigSchema } from "@/lib/validations/wedding-content";

/**
 * Route-group layout that scopes the wedding's selected template / theme /
 * font CSS to **guest-facing pages only**. The admin route ([slug]/admin/*)
 * lives outside this group and therefore renders with the project's default
 * appearance regardless of the wedding's design choices.
 */
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await getWeddingBySlug(slug);

  if (!wedding) {
    notFound();
  }

  // Resolve template → theme + font with resolve-on-read fallback. Null
  // fields on the wedding inherit the template's defaults; non-null fields
  // win (user customization). This is what makes template switches additive:
  // a user-customized themeId or fontId survives even when templateId changes.
  const weddingRecord = await db.wedding.findUnique({
    where: { id: wedding.weddingId },
    select: { themeId: true, templateId: true, designConfig: true },
  });
  const template = getTemplatePreset(weddingRecord?.templateId);
  const design = designConfigSchema.parse(weddingRecord?.designConfig ?? {});

  const effectiveThemeId = weddingRecord?.themeId ?? template.defaultThemeId;
  const effectiveFontId = design.fontId ?? template.defaultFontId;

  const themeCss = generateThemeCss(getThemePreset(effectiveThemeId));
  const fontCss = generateFontCss(getFontPairing(effectiveFontId));

  const customCss = `${themeCss}${fontCss ? ` ${fontCss}` : ""}`;

  return (
    <>
      {customCss && (
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: theme + font CSS variables are controlled server-side from preset definitions
          dangerouslySetInnerHTML={{
            __html: customCss,
          }}
        />
      )}
      {children}
    </>
  );
}
