"use client";

import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { useMemo } from "react";
import { getThemePreset, type ThemePreset } from "@/lib/themes";

interface OnboardingPreviewProps {
  coupleName: string;
  weddingDate?: string;
  themeId?: string;
  photoUrls: string[];
  className?: string;
}

function buildCssVars(theme: ThemePreset): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.cssVariables)) {
    vars[key] = value;
  }
  return vars;
}

export function OnboardingPreview({
  coupleName,
  weddingDate,
  themeId,
  photoUrls,
  className,
}: OnboardingPreviewProps) {
  const theme = useMemo(() => getThemePreset(themeId), [themeId]);
  const cssVars = useMemo(() => buildCssVars(theme), [theme]);

  const bgImage = photoUrls[0];
  const formattedDate = weddingDate
    ? format(new Date(`${weddingDate}T00:00:00`), "MMMM d, yyyy")
    : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border shadow-lg",
        "aspect-[9/16] max-h-[600px] w-full",
        className,
      )}
      style={cssVars}
    >
      {/* Background */}
      <div className="absolute inset-0 transition-all duration-700 ease-in-out">
        {bgImage ? (
          // biome-ignore lint/performance/noImgElement: blob URLs from client-side File objects cannot use next/image
          <img
            src={bgImage}
            alt="Wedding preview"
            className="h-full w-full object-cover transition-opacity duration-700"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${theme.preview.primary}40 0%, ${theme.preview.accent}60 50%, ${theme.preview.background} 100%)`,
            }}
          />
        )}
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {coupleName ? (
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white uppercase opacity-80 drop-shadow-lg tracking-widest leading-tight">
            {coupleName}
          </h2>
        ) : (
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white/40 uppercase tracking-widest">
            Your Names
          </h2>
        )}
        {formattedDate && (
          <p className="mt-4 text-sm sm:text-base text-white/70 font-light tracking-wide drop-shadow">
            {formattedDate}
          </p>
        )}
      </div>

      {/* Photo count badge */}
      {photoUrls.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
          {photoUrls.length} photos
        </div>
      )}

      {/* "Live Preview" label */}
      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
        Live Preview
      </div>
    </div>
  );
}
