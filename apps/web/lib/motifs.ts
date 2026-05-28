/**
 * Decorative motif packs.
 *
 * Pure metadata for the curated wedding motifs. The matching SVG components
 * live in @workspace/ui/components/motifs; this module is kept component-free
 * so it stays easy to unit test. The default ("none") renders no decoration,
 * preserving the original undecorated appearance.
 */

export interface MotifPack {
  id: string;
  name: string;
  description: string;
}

export const MOTIF_PACKS: MotifPack[] = [
  {
    id: "none",
    name: "None",
    description: "No decorative dividers — clean and simple (default)",
  },
  {
    id: "floral",
    name: "Floral",
    description: "Delicate floral sprig dividers between sections",
  },
  {
    id: "rings",
    name: "Rings",
    description: "Interlocking wedding-ring dividers between sections",
  },
  {
    id: "botanical",
    name: "Botanical",
    description: "Minimal leafy botanical dividers between sections",
  },
  {
    id: "floral-roses",
    name: "Floral Roses",
    description:
      "Center-clustered rose-and-leaves divider — pairs with the Lovebird-style dark template",
  },
];

const DEFAULT_MOTIF = MOTIF_PACKS[0] as MotifPack;

/**
 * Get a motif pack by ID. Returns the default ("none") if not found.
 */
export function getMotifPack(motifId: string | null | undefined): MotifPack {
  if (!motifId) return DEFAULT_MOTIF;
  return MOTIF_PACKS.find((m) => m.id === motifId) ?? DEFAULT_MOTIF;
}
