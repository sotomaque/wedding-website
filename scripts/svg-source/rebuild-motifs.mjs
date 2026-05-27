import { readFileSync, writeFileSync } from "node:fs";

const motifsPath = "../../packages/ui/src/components/motifs.tsx";

function extractAllPathDs(svgPath) {
  const svg = readFileSync(svgPath, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1];
  const ds = [...svg.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
  const transformMatch = svg.match(/<path[^>]*transform="([^"]+)"/);
  return {
    viewBox,
    ds,
    transform: transformMatch ? transformMatch[1] : null,
  };
}

const roses = extractAllPathDs("./oc-315389.opt.svg");
const peony = extractAllPathDs("./oc-58351.opt.svg");
const corner = extractAllPathDs("./oc-191158.opt.svg");

// 191158 is a true corner-shaped asymmetric flourish (~470×470 viewBox,
// 29 paths, semi-freehand). Use the full viewBox — no cropping needed.
// The CSS mirror on the right side of the hero pairs it naturally.
const cornerCropViewBox = corner.viewBox;

console.log("roses:", roses.viewBox, "paths=", roses.ds.length);
console.log("peony:", peony.viewBox, "paths=", peony.ds.length, "transform=", peony.transform);
console.log("corner:", corner.viewBox, "→ cropped:", cornerCropViewBox, "paths=", corner.ds.length);

const header = [
  "/**",
  " * Decorative wedding motifs.",
  " *",
  " * Section dividers for the public wedding site. They use `currentColor` so",
  " * the surrounding text color (typically the theme accent) drives their",
  " * appearance, keeping them in sync with the selected color theme.",
  " *",
  " * Sources are a mix of self-authored line-art (the small dividers + the",
  " * deferred placeholders) and CC0 / public-domain SVGs from Openclipart,",
  " * optimized via SVGO and re-rooted with `fill=\"currentColor\"`. Each",
  " * function documents its source inline where applicable.",
  " *",
  " * Icon sets (Phosphor-backed) live in motif-icons.tsx behind a \"use client\"",
  " * boundary because Phosphor evaluates `createContext` at module load and",
  " * can't be imported into a React Server Component graph.",
  " */",
  "",
  "import { cn } from \"@workspace/ui/lib/utils\";",
  "",
  "type MotifSvgProps = { className?: string };",
  "",
].join("\n");

const smallDividers = `function FloralDivider({ className }: MotifSvgProps) {
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
`;

const rosesPaths = roses.ds.map((d) => `      <path d="${d}" />`).join("\n");
const floralRoses = `/**
 * Symmetric floral flourish divider — center motif flanked by mirrored leaf
 * sprigs, swirls, and decorative blossoms. Sourced from Openclipart
 * "Elegant Divider Line Art" (CC0 / public domain:
 * https://openclipart.org/detail/315389/elegant-divider-line-art),
 * optimized via SVGO and re-rooted with \`fill="currentColor"\` so the entire
 * ornament tints to the surrounding text color (the theme accent on
 * Lovebird).
 */
function FloralRosesDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="${roses.viewBox}"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
${rosesPaths}
    </svg>
  );
}
`;

const cornerPaths = corner.ds.map((d) => `      <path d="${d}" />`).join("\n");
const floralCorner = `/**
 * Corner spray for the Lovebird hero card. Sourced from Openclipart
 * "Corner Flourish" (CC0 / public domain:
 * https://openclipart.org/detail/191158/corner-flourish). True
 * corner-shaped asymmetric semi-freehand flourish — full viewBox used as-is.
 * The right corner is produced by the existing CSS mirror (transform:
 * scaleX(-1)) on the hero card.
 */
function FloralCorner({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="${cornerCropViewBox}"
      fill="currentColor"
      overflow="visible"
      className={className}
      aria-hidden="true"
    >
${cornerPaths}
    </svg>
  );
}
`;

const eucalyptus = `/**
 * Eucalyptus divider — placeholder hand-drawn pendulous leaf clusters.
 *
 * TODO: still hand-drawn. Tried sourcing Openclipart 174679 (Eucalyptus
 * leaves silhouette, CC0) but the asset is a tall portrait stem (~327×534
 * viewBox, ~1:1.6 aspect) — doesn't fit the ~10:1 divider slot even after
 * rotation. Needs a properly horizontal eucalyptus/olive sprig asset. No
 * template currently references this motif so it's a placeholder.
 */
function EucalyptusDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="0 0 240 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="10" y1="12" x2="96" y2="12" opacity="0.45" />
      <line x1="144" y1="12" x2="230" y2="12" opacity="0.45" />

      {/* Center stem */}
      <path d="M104 12c4-1 8-1 16 0 8 1 12 1 16 0" />

      {/* Leaf pairs descending along the stem (left-of-center) */}
      <ellipse cx="108" cy="8" rx="3" ry="1.5" transform="rotate(-30 108 8)" />
      <ellipse cx="108" cy="16" rx="3" ry="1.5" transform="rotate(30 108 16)" />
      <ellipse cx="116" cy="6" rx="3.5" ry="1.5" transform="rotate(-25 116 6)" />
      <ellipse cx="116" cy="18" rx="3.5" ry="1.5" transform="rotate(25 116 18)" />

      {/* Center bud */}
      <circle cx="120" cy="12" r="1.5" fill="currentColor" stroke="none" />

      {/* Leaf pairs (right-of-center, mirror) */}
      <ellipse cx="124" cy="6" rx="3.5" ry="1.5" transform="rotate(25 124 6)" />
      <ellipse cx="124" cy="18" rx="3.5" ry="1.5" transform="rotate(-25 124 18)" />
      <ellipse cx="132" cy="8" rx="3" ry="1.5" transform="rotate(30 132 8)" />
      <ellipse cx="132" cy="16" rx="3" ry="1.5" transform="rotate(-30 132 16)" />
    </svg>
  );
}
`;

const peonyXform = peony.transform ? ` transform="${peony.transform}"` : "";
const peonySprig = `/**
 * Peony / floral divider — single dense floral cluster with side accents.
 * Sourced from Openclipart "Small Floral Divider" (CC0 / public domain:
 * https://openclipart.org/detail/58351/small-floral-divider). Optimized via
 * SVGO and re-rooted with \`fill="currentColor"\` so the ornament tints to
 * the surrounding text color.
 */
function PeonySprigDivider({ className }: MotifSvgProps) {
  return (
    <svg
      viewBox="${peony.viewBox}"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="${peony.ds[0]}"${peonyXform} />
    </svg>
  );
}
`;

const footer = `const DIVIDERS: Record<string, (props: MotifSvgProps) => React.JSX.Element> = {
  floral: FloralDivider,
  rings: RingsDivider,
  botanical: BotanicalDivider,
  "floral-roses": FloralRosesDivider,
  eucalyptus: EucalyptusDivider,
  "peony-sprig": PeonySprigDivider,
};

/**
 * Render a decorative divider for the given motif id. Returns null for
 * "none" / unknown ids so the default (no decoration) renders nothing.
 *
 * Icon sets (Phosphor-backed) live in motif-icons.tsx behind a "use client"
 * boundary — the dividers stay server-renderable.
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
  EucalyptusDivider,
  PeonySprigDivider,
};
`;

const out = [
  header,
  smallDividers,
  floralRoses,
  floralCorner,
  eucalyptus,
  peonySprig,
  footer,
].join("\n");

writeFileSync(motifsPath, out);
console.log("wrote motifs.tsx, bytes:", out.length);
