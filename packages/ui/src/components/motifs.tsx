/**
 * Decorative wedding motifs.
 *
 * Self-authored SVGs (no third-party licensing) used as section dividers on
 * the public wedding site. They use `currentColor` so the surrounding text
 * color (typically the theme accent) drives their appearance, keeping them
 * in sync with the selected color theme.
 */

import { cn } from "@workspace/ui/lib/utils";

type MotifSvgProps = { className?: string };

function FloralDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="10" y1="12" x2="96" y2="12" />
      <line x1="144" y1="12" x2="230" y2="12" />
      <path d="M120 4c-4 4-4 12 0 16 4-4 4-12 0-16Z" />
      <path d="M112 8c0 4 3 6 8 4M128 8c0 4-3 6-8 4" />
      <circle cx="100" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="140" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RingsDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="10" y1="12" x2="104" y2="12" />
      <line x1="136" y1="12" x2="230" y2="12" />
      <circle cx="114" cy="12" r="6" />
      <circle cx="126" cy="12" r="6" />
    </svg>
  );
}

function BotanicalDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M40 12h160" />
      <path d="M120 12c-6-3-10-1-14 3M120 12c6-3 10-1 14 3M120 12c-6 3-10 1-14-3M120 12c6 3 10 1 14-3" />
      <circle cx="120" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Center-clustered rose-and-leaves divider inspired by Lovebird's "Elegant"
 * template. Drawn original (no copyright lift); strokes only so it tints to
 * the surrounding text color via `currentColor`. Designed for dark themes
 * with a cream accent — open rose blooms in the center, curving leaf
 * arrangements on either side, thin hairlines extending outward.
 */
function FloralRosesDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="0 0 360 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Horizontal hairlines extending out from the cluster */}
      <line x1="10" y1="36" x2="120" y2="36" opacity="0.45" />
      <line x1="240" y1="36" x2="350" y2="36" opacity="0.45" />

      {/* Left leaf sprig */}
      <path d="M125 36c-6-10-18-12-30-10" opacity="0.7" />
      <path d="M110 28c-6 2-10 8-10 16" opacity="0.7" />
      <path d="M99 40c4-4 9-5 14-3" opacity="0.7" />
      <path d="M118 22c-2 4-2 9 0 14" opacity="0.7" />
      <path d="M133 32c-4-3-10-3-15 0" opacity="0.7" />

      {/* Left smaller rose */}
      <circle cx="145" cy="32" r="6" />
      <path d="M141 32c1-3 7-3 8 0" />
      <path d="M141 32c1 3 7 3 8 0" />
      <path d="M145 28v8" />

      {/* Center rose (larger) */}
      <circle cx="180" cy="36" r="10" />
      <path d="M173 36c2-5 12-5 14 0" />
      <path d="M173 36c2 5 12 5 14 0" />
      <path d="M180 28v16" />
      <path d="M175 32c4-2 6-2 10 0" opacity="0.7" />
      <path d="M175 40c4 2 6 2 10 0" opacity="0.7" />

      {/* Right smaller rose */}
      <circle cx="215" cy="32" r="6" />
      <path d="M211 32c1-3 7-3 8 0" />
      <path d="M211 32c1 3 7 3 8 0" />
      <path d="M215 28v8" />

      {/* Right leaf sprig (mirror of left) */}
      <path d="M235 36c6-10 18-12 30-10" opacity="0.7" />
      <path d="M250 28c6 2 10 8 10 16" opacity="0.7" />
      <path d="M261 40c-4-4-9-5-14-3" opacity="0.7" />
      <path d="M242 22c2 4 2 9 0 14" opacity="0.7" />
      <path d="M227 32c4-3 10-3 15 0" opacity="0.7" />

      {/* Tiny decorative dots */}
      <circle cx="125" cy="36" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="235" cy="36" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="160" cy="48" r="1" fill="currentColor" stroke="none" />
      <circle cx="200" cy="48" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Corner spray of roses + leaves intended for the Lovebird-style hero card.
 * Mirror it (transform="scale(-1,1)") for the right corner. Strokes only so
 * it tints to the surrounding text color.
 */
function FloralCorner({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="0 0 180 140"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Trailing leaves curving down from top */}
      <path d="M10 10c14 10 28 26 36 50" opacity="0.55" />
      <path d="M20 22c-2 8 0 16 6 22" opacity="0.55" />
      <path d="M36 38c-4 4-6 10-5 18" opacity="0.55" />

      {/* Top-left rose cluster (3 blooms, descending sizes) */}
      <circle cx="44" cy="34" r="14" />
      <path d="M34 34c2-8 18-8 20 0" />
      <path d="M34 34c2 8 18 8 20 0" />
      <path d="M44 22v24" />
      <path d="M36 28c4-2 12-2 16 0" opacity="0.7" />
      <path d="M36 40c4 2 12 2 16 0" opacity="0.7" />

      <circle cx="76" cy="50" r="10" />
      <path d="M69 50c1-5 13-5 14 0" />
      <path d="M69 50c1 5 13 5 14 0" />
      <path d="M76 42v16" />

      <circle cx="100" cy="78" r="8" />
      <path d="M94 78c1-4 11-4 12 0" />
      <path d="M94 78c1 4 11 4 12 0" />

      {/* Bottom-trailing leaves */}
      <path d="M110 88c8 6 14 18 16 32" opacity="0.55" />
      <path d="M122 100c-2 4-2 12 0 18" opacity="0.55" />
      <path d="M132 112c4 2 8 10 8 18" opacity="0.55" />

      {/* Scattered small dots */}
      <circle cx="22" cy="60" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="60" cy="22" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="90" cy="100" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const DIVIDERS: Record<string, (props: MotifSvgProps) => React.JSX.Element> = {
  floral: FloralDivider,
  rings: RingsDivider,
  botanical: BotanicalDivider,
  "floral-roses": FloralRosesDivider,
};

/**
 * Render a decorative divider for the given motif id. Returns null for
 * "none" / unknown ids so the default (no decoration) renders nothing.
 */
export function MotifDivider({
  motifId,
  className,
}: {
  motifId?: string;
  className?: string;
}) {
  const Svg = motifId ? DIVIDERS[motifId] : undefined;
  if (!Svg) return null;
  // The bigger floral-roses motif wants more room than the original simple
  // dividers; size the wrapper by motif type rather than baking sizing into
  // the SVG itself so existing motifs render unchanged.
  const isLarge = motifId === "floral-roses";
  return (
    <div
      className={cn(
        "flex justify-center text-accent",
        isLarge ? "py-10 lg:py-14" : "py-6 lg:py-10",
        className,
      )}
    >
      <Svg
        className={cn(
          isLarge
            ? "h-14 lg:h-20 w-auto max-w-105 opacity-90"
            : "h-6 w-auto max-w-60 opacity-80",
        )}
      />
    </div>
  );
}

export {
  FloralDivider,
  RingsDivider,
  BotanicalDivider,
  FloralRosesDivider,
  FloralCorner,
};
